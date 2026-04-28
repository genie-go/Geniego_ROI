# GENIE ROI V379 - AWS Terraform (Runnable)

This Terraform stack provisions a runnable baseline for V379 on AWS:

- VPC (public + private subnets, NAT)
- ALB (public) -> ECS Fargate (API)
- Optional ECS Fargate worker service
- RDS PostgreSQL (private)
- SQS queue for jobs
- Secrets Manager secret for DB connection
- S3 + CloudFront for React frontend static hosting
- Optional EventBridge schedule to trigger an ECS task for batch jobs

## Prerequisites
- Terraform >= 1.6
- AWS credentials with permissions for VPC/ECS/ALB/RDS/S3/CloudFront/SQS/Secrets/EventBridge/IAM
- Container images pushed (ECR or any registry accessible by ECS)

## Quick start
```bash
cd infra/aws/terraform
terraform init
terraform apply
```

### Required variables
Set `api_image` (and optionally `worker_image`):

```bash
terraform apply \
  -var 'api_image=<account>.dkr.ecr.<region>.amazonaws.com/genie-roi-api:latest' \
  -var 'worker_image=<account>.dkr.ecr.<region>.amazonaws.com/genie-roi-worker:latest'
```

After apply, Terraform outputs:
- `alb_dns_name` for API base URL
- `cloudfront_domain` for frontend

## Frontend deployment
Build frontend and upload to S3:
```bash
cd ../../..
cd frontend
npm ci
npm run build

aws s3 sync dist/ s3://<frontend_bucket> --delete
```

## Notes
- RDS has deletion protection enabled. Disable it explicitly if you want to destroy.
- This is a baseline template; production hardening should add:
  - HTTPS listener with ACM cert
  - WAF on CloudFront/ALB
  - private ECR + image scanning
  - autoscaling policies
