
# V380 AWS Production Deployment (Terraform)

This Terraform set is intended as a *runnable baseline* for production-hardening:
- HTTPS (ACM) + HTTP->HTTPS redirect
- WAFv2 (ALB + CloudFront)
- ECS autoscaling
- Optional CodeDeploy blue/green (advanced)
- Optional Secrets Manager rotation (skeleton)

## Prereqs
- Terraform >= 1.6
- AWS CLI credentials
- A Route53 hosted zone if using Terraform-managed ACM validation

## Apply
```bash
cd infra/aws/terraform
terraform init
terraform apply \
  -var 'project=genie-roi' \
  -var 'env=prod' \
  -var 'api_image=YOUR_ECR_IMAGE' \
  -var 'domain_name=api.example.com' \
  -var 'hosted_zone_id=Z123456...'
```

## Notes
- For CloudFront custom domain HTTPS you must request/attach an ACM certificate in **us-east-1**.
- Enable `enable_blue_green=true` only after updating the ECS service deployment_controller to CODE_DEPLOY.
- Secrets rotation is provided as a runnable skeleton; implement full rotation steps before relying on it.
