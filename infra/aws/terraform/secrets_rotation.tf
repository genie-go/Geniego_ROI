locals {
  enable_rotation = var.enable_secrets_rotation
}

# Build note:
# To include dependencies, run inside infra/aws/lambda/rotate_db_secret:
#   pip install -r requirements.txt -t .
# before `terraform apply`. Terraform will then zip the folder contents.

data "archive_file" "rotation_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/rotate_db_secret"
  output_path = "${path.module}/../lambda/rotate_db_secret/rotation.zip"
}

resource "aws_iam_role" "rotation_lambda" {
  count = local.enable_rotation ? 1 : 0
  name  = "${local.name}-rotation-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "rotation_basic" {
  count      = local.enable_rotation ? 1 : 0
  role       = aws_iam_role.rotation_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "rotation_secret_policy" {
  count = local.enable_rotation ? 1 : 0
  name  = "${local.name}-rotation-secret-policy"
  role  = aws_iam_role.rotation_lambda[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "rotation" {
  count         = local.enable_rotation ? 1 : 0
  function_name = "${local.name}-db-rotation"
  role          = aws_iam_role.rotation_lambda[0].arn
  handler       = "handler.handler"
  runtime       = "python3.11"
  filename      = data.archive_file.rotation_zip.output_path
  source_code_hash = data.archive_file.rotation_zip.output_base64sha256
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = local.tags
}

resource "aws_lambda_permission" "allow_secretsmanager" {
  count         = local.enable_rotation ? 1 : 0
  statement_id  = "AllowExecutionFromSecretsManager"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation[0].function_name
  principal     = "secretsmanager.amazonaws.com"
}

resource "aws_secretsmanager_secret_rotation" "db" {
  count               = local.enable_rotation ? 1 : 0
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotation[0].arn

  rotation_rules {
    automatically_after_days = var.secrets_rotation_days
  }
}
