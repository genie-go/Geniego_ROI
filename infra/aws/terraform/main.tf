terraform {
  required_version = ">= 1.6.0"
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

locals {
  name = "${var.project}-${var.env}"
  tags = merge({
    Project = var.project
    Env     = var.env
  }, var.extra_tags)

  frontend_bucket = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "${var.project}-${var.env}-${data.aws_caller_identity.current.account_id}-frontend"
}

resource "random_password" "db" {
  length  = 32
  special = true
}

locals {
  db_password_effective = var.db_password != "" ? var.db_password : random_password.db.result
}

# -------------------------
# VPC
# -------------------------
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(local.tags, { Name = "${local.name}-vpc" })
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { Name = "${local.name}-igw" })
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.tags, { Name = "${local.name}-public-${count.index}" })
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(local.tags, { Name = "${local.name}-private-${count.index}" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { Name = "${local.name}-public-rt" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  count = 1
  tags  = merge(local.tags, { Name = "${local.name}-nat-eip" })
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags          = merge(local.tags, { Name = "${local.name}-nat" })
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { Name = "${local.name}-private-rt" })
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# -------------------------
# Security Groups
# -------------------------
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "ALB security group"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.name}-alb-sg" })
}

resource "aws_security_group" "ecs" {
  name        = "${local.name}-ecs-sg"
  description = "ECS tasks security group"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.name}-ecs-sg" })
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "RDS security group"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.name}-rds-sg" })
}

# -------------------------
# RDS Postgres
# -------------------------
resource "aws_db_subnet_group" "postgres" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = local.tags
}

resource "aws_db_instance" "postgres" {
  identifier             = "${local.name}-postgres"
  engine                 = "postgres"
  engine_version         = "15.5"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage_gb
  db_name                = var.db_name
  username               = var.db_username
  password               = local.db_password_effective
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = var.db_multi_az
  storage_encrypted      = true
  backup_retention_period = 7
  deletion_protection    = true
  skip_final_snapshot    = false
  publicly_accessible    = false
  tags                   = local.tags
}

# -------------------------
# Secrets Manager
# -------------------------
resource "aws_secretsmanager_secret" "db" {
  name = "${local.name}/db"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = local.db_password_effective
    host     = aws_db_instance.postgres.address
    port     = 5432
    dbname   = var.db_name
  })
}

# -------------------------
# SQS (jobs / ingestion / batch)
# -------------------------
resource "aws_sqs_queue" "jobs" {
  name                      = "${local.name}-jobs"
  message_retention_seconds = 1209600
  visibility_timeout_seconds = 120
  tags                      = local.tags
}

# -------------------------
# ECS (Fargate)
# -------------------------
resource "aws_ecs_cluster" "this" {
  name = "${local.name}-cluster"
  tags = local.tags
}

data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name}-task-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "task_exec" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "task_policy" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_secretsmanager_secret.db.arn,
      aws_sqs_queue.jobs.arn
    ]
  }
}

resource "aws_iam_policy" "task" {
  name   = "${local.name}-task-policy"
  policy = data.aws_iam_policy_document.task_policy.json
}

resource "aws_iam_role_policy_attachment" "task" {
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.task.arn
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${local.name}-worker"
  retention_in_days = 30
  tags              = local.tags
}

locals {
  database_url = "postgresql+psycopg2://${var.db_username}:${local.db_password_effective}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.api_cpu)
  memory                   = tostring(var.api_memory)
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = var.api_image
      essential = true
      portMappings = [{ containerPort = var.container_port, hostPort = var.container_port, protocol = "tcp" }]
      environment = [
        { name = "DATABASE_URL", value = local.database_url },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.jobs.url },
        { name = "APP_ENV", value = var.env }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
  tags = local.tags
}

resource "aws_ecs_task_definition" "worker" {
  count                    = var.worker_image != "" ? 1 : 0
  family                   = "${local.name}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.worker_cpu)
  memory                   = tostring(var.worker_memory)
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "worker"
      image = var.worker_image
      essential = true
      environment = [
        { name = "DATABASE_URL", value = local.database_url },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.jobs.url },
        { name = "APP_ENV", value = var.env }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.worker.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
  tags = local.tags
}

# -------------------------
# ALB -> ECS API service
# -------------------------
resource "aws_lb" "api" {
  name               = "${local.name}-api"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = local.tags
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.this.id
  target_type = "ip"

  health_check {
    path                = "/v379/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200-399"
  }

  tags = local.tags
}

resource "aws_lb_listener" "http" {
  count             = !(var.enable_https && local.acm_arn_effective != "") ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]
  tags       = local.tags
}

resource "aws_ecs_service" "worker" {
  count           = var.worker_image != "" ? 1 : 0
  name            = "${local.name}-worker"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.worker[0].arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  tags = local.tags
}

# -------------------------
# Frontend: S3 static website + CloudFront
# -------------------------
resource "aws_s3_bucket" "frontend" {
  bucket = local.frontend_bucket
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule { object_ownership = "BucketOwnerPreferred" }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name}-oac"
  description                       = "OAC for S3 frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "frontend_bucket_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals { type = "Service" identifiers = ["cloudfront.amazonaws.com"] }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  web_acl_id = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions { geo_restriction { restriction_type = "none" } }

  viewer_certificate {
    cloudfront_default_certificate = var.frontend_custom_domain == "" ? true : false
    acm_certificate_arn            = var.frontend_custom_domain != "" ? local.frontend_acm_arn_effective : null
    ssl_support_method             = var.frontend_custom_domain != "" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  aliases = var.frontend_custom_domain != "" ? [var.frontend_custom_domain] : []

  tags = local.tags
}

# -------------------------
# EventBridge schedule -> ECS RunTask (batch)
# -------------------------
resource "aws_iam_role" "events" {
  name               = "${local.name}-events-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = local.tags
}

data "aws_iam_policy_document" "events_policy" {
  statement {
    actions = ["ecs:RunTask", "iam:PassRole"]
    resources = concat(
      [aws_ecs_task_definition.api.arn],
      var.worker_image != "" ? [aws_ecs_task_definition.worker[0].arn] : []
    )
  }
  statement {
    actions   = ["ecs:RunTask"]
    resources = ["*"]
  }
  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.task_execution.arn, aws_iam_role.task.arn]
  }
}

resource "aws_iam_policy" "events" {
  name   = "${local.name}-events-policy"
  policy = data.aws_iam_policy_document.events_policy.json
}

resource "aws_iam_role_policy_attachment" "events" {
  role       = aws_iam_role.events.name
  policy_arn = aws_iam_policy.events.arn
}

resource "aws_cloudwatch_event_rule" "batch" {
  count              = var.enable_schedules ? 1 : 0
  name               = "${local.name}-batch"
  schedule_expression = var.batch_cron
  tags               = local.tags
}

resource "aws_cloudwatch_event_target" "batch" {
  count     = var.enable_schedules ? 1 : 0
  rule      = aws_cloudwatch_event_rule.batch[0].name
  arn       = aws_ecs_cluster.this.arn
  role_arn  = aws_iam_role.events.arn

  ecs_target {
    task_definition_arn = aws_ecs_task_definition.api.arn
    launch_type         = "FARGATE"
    network_configuration {
      subnets         = aws_subnet.private[*].id
      security_groups = [aws_security_group.ecs.id]
      assign_public_ip = false
    }
    platform_version = "LATEST"
  }

  input = jsonencode({
    containerOverrides = [{
      name = "api"
      environment = [
        { name = "BATCH_MODE", value = "true" }
      ]
    }]
  })
}
