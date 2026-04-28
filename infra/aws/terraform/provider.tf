provider "aws" {
  region = var.aws_region
}

# Provider alias for global services (CloudFront ACM/WAF)
provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

