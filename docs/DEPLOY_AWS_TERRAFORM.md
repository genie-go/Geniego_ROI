# Deploy on AWS with Terraform (V378)

## 1) Build & push images
- backend: build and push to ECR (api_image)
- optional worker: same image or dedicated worker image

## 2) Configure secrets
- DATABASE_URL (Secrets Manager)
- JWT_SECRET
- Any connector tokens

## 3) Terraform skeleton
Path: `infra/aws/terraform`

This is a skeleton. Typical production setup:
- VPC (public/private subnets, NAT)
- ALB -> ECS Fargate Service (api)
- RDS Postgres (Multi-AZ)
- S3 + CloudFront for `frontend` build output
- SQS for ingestion/batch
- EventBridge schedule for:
  - `/v378/ai/risk/batch-run` triggers via worker
  - report generation jobs

## 4) Observability
- CloudWatch logs for API/worker
- Alarms for 5xx, latency, DB connections
