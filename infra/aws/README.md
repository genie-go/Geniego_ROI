# AWS IaC(스텁)
Terraform 또는 CDK로 구성 권장.

## 권장 리소스
- VPC(2AZ), ALB, ECS(Fargate) api/worker, RDS Postgres, S3, CloudFront, SQS, CloudWatch, Secrets Manager

## 다음 단계
- 실제 계정/리전/도메인 기준으로 `terraform.tfvars` 작성
- Secret rotation / RDS 파라미터 그룹 / 백업 정책 설정
