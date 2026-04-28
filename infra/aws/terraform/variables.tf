variable "aws_region" { type = string  default = "ap-northeast-2" }

variable "project"    { type = string  default = "genie-roi" }
variable "env"        { type = string  default = "prod" }

# --- Networking ---
variable "vpc_cidr" { type = string default = "10.50.0.0/16" }
variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.50.0.0/24", "10.50.1.0/24"]
}
variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.50.10.0/24", "10.50.11.0/24"]
}

# --- Containers ---
# Provide images like:
#   <account>.dkr.ecr.<region>.amazonaws.com/genie-roi-api:latest
variable "api_image"    { type = string }
variable "worker_image" { type = string default = "" } # optional

variable "api_cpu"    { type = number default = 512 }
variable "api_memory" { type = number default = 1024 }
variable "worker_cpu" { type = number default = 512 }
variable "worker_memory" { type = number default = 1024 }

variable "api_desired_count" { type = number default = 2 }
variable "worker_desired_count" { type = number default = 1 }

variable "container_port" { type = number default = 8000 }

# --- Database (RDS Postgres) ---
variable "db_username" { type = string default = "genie" }
variable "db_password" {
  type      = string
  sensitive = true
  default   = "" # if empty, a random password will be generated
}
variable "db_name" { type = string default = "genie" }
variable "db_instance_class" { type = string default = "db.t4g.medium" }
variable "db_allocated_storage_gb" { type = number default = 50 }
variable "db_multi_az" { type = bool default = true }

# --- Frontend (S3 + CloudFront) ---
variable "frontend_bucket_name" { type = string default = "" } # if empty, derived from project/env/account
variable "frontend_custom_domain" { type = string default = "" } # optional
variable "acm_certificate_arn" { type = string default = "" }   # required if frontend_custom_domain is set

# --- Queues / Schedules ---
variable "enable_schedules" { type = bool default = true }
variable "batch_cron" {
  type    = string
  default = "cron(0 1 * * ? *)" # daily 01:00 UTC
}

# --- Tags ---
variable "extra_tags" { type = map(string) default = {} }


# -------------------------
# V380 - Production hardening
# -------------------------
variable "domain_name" {
  description = "Optional custom domain for API and/or frontend (e.g. api.example.com). If empty, HTTPS resources are skipped unless acm_certificate_arn is provided."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Route53 Hosted Zone ID for domain validation and DNS records. Required if domain_name is set and you want Terraform to create/validate ACM cert."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN to use for HTTPS. If provided, Terraform will not create a new cert."
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Enable HTTPS listener on ALB and CloudFront custom domain support (requires certificate)."
  type        = bool
  default     = true
}

variable "enable_waf" {
  description = "Enable AWS WAFv2 for ALB and CloudFront."
  type        = bool
  default     = true
}

variable "enable_blue_green" {
  description = "Enable CodeDeploy blue/green deployments for ECS service (advanced)."
  type        = bool
  default     = false
}

variable "min_tasks" {
  description = "Minimum ECS tasks for autoscaling."
  type        = number
  default     = 2
}

variable "max_tasks" {
  description = "Maximum ECS tasks for autoscaling."
  type        = number
  default     = 10
}

variable "cpu_target_utilization" {
  description = "Target CPU utilization percentage for autoscaling."
  type        = number
  default     = 60
}

variable "memory_target_utilization" {
  description = "Target memory utilization percentage for autoscaling."
  type        = number
  default     = 70
}

variable "enable_secrets_rotation" {
  description = "Enable Secrets Manager rotation for the DB secret (creates a rotation Lambda)."
  type        = bool
  default     = false
}

variable "secrets_rotation_schedule_expression" {
  description = "Rotation schedule (e.g. rate(30 days))."
  type        = string
  default     = "rate(30 days)"
}

variable "frontend_hosted_zone_id" {
  description = "Route53 hosted zone id for frontend custom domain validation/alias"
  type        = string
  default     = ""
}

variable "frontend_acm_certificate_arn" {
  description = "Existing ACM cert ARN in us-east-1 for CloudFront (optional)"
  type        = string
  default     = ""
}

variable "waf_rate_limit" {
  description = "Rate limit (requests per 5 minutes per IP) for custom WAF rule. 0 disables."
  type        = number
  default     = 2000
}

variable "waf_block_countries" {
  description = "List of ISO country codes to block (optional)"
  type        = list(string)
  default     = []
}

variable "waf_allow_ip_cidrs" {
  description = "Allowlist CIDRs (optional). If set, only these IPs are allowed via higher priority rule."
  type        = list(string)
  default     = []
}

variable "waf_block_ip_cidrs" {
  description = "Blocklist CIDRs (optional)."
  type        = list(string)
  default     = []
}

variable "secrets_rotation_days" {
  description = "Rotation interval in days"
  type        = number
  default     = 30
}
