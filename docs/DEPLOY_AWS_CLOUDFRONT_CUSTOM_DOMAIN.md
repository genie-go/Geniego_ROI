# AWS: CloudFront Custom Domain (ACM in us-east-1) - V381

## What this does
- Creates/validates an ACM certificate in **us-east-1** for the frontend custom domain
- Adds Route53 DNS validation record (if `frontend_hosted_zone_id` is set)
- Configures the CloudFront distribution to use that cert
- Creates Route53 alias `A` record to the CloudFront distribution

## Required inputs
- `frontend_custom_domain` (e.g. `app.example.com`)
- `frontend_hosted_zone_id` (Route53 hosted zone ID that owns the domain)

## Optional
- If you already have a cert in us-east-1: set `frontend_acm_certificate_arn` and skip creation.

## Apply
```bash
terraform init
terraform apply \
  -var 'frontend_custom_domain=app.example.com' \
  -var 'frontend_hosted_zone_id=Z123...'
```
