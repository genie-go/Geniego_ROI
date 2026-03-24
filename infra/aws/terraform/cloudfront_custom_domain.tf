locals {
  use_frontend_custom_domain = var.frontend_custom_domain != ""
  use_frontend_acm_existing  = var.frontend_acm_certificate_arn != ""
}

# CloudFront requires ACM certificate in us-east-1.
resource "aws_acm_certificate" "frontend_use1" {
  provider          = aws.use1
  count             = local.use_frontend_custom_domain && !local.use_frontend_acm_existing ? 1 : 0
  domain_name       = var.frontend_custom_domain
  validation_method = "DNS"
  tags              = local.tags
}

resource "aws_route53_record" "frontend_acm_validation" {
  count   = length(aws_acm_certificate.frontend_use1) > 0 ? 1 : 0
  zone_id = var.frontend_hosted_zone_id
  name    = aws_acm_certificate.frontend_use1[0].domain_validation_options[0].resource_record_name
  type    = aws_acm_certificate.frontend_use1[0].domain_validation_options[0].resource_record_type
  ttl     = 60
  records = [aws_acm_certificate.frontend_use1[0].domain_validation_options[0].resource_record_value]
}

resource "aws_acm_certificate_validation" "frontend_use1" {
  provider                = aws.use1
  count                   = length(aws_acm_certificate.frontend_use1) > 0 ? 1 : 0
  certificate_arn         = aws_acm_certificate.frontend_use1[0].arn
  validation_record_fqdns = [aws_route53_record.frontend_acm_validation[0].fqdn]
}

locals {
  frontend_acm_arn_effective = local.use_frontend_acm_existing ? var.frontend_acm_certificate_arn : (
    length(aws_acm_certificate_validation.frontend_use1) > 0 ? aws_acm_certificate_validation.frontend_use1[0].certificate_arn : ""
  )
}

# Optional DNS record for the frontend custom domain -> CloudFront distribution
resource "aws_route53_record" "frontend_a" {
  count   = local.use_frontend_custom_domain && var.frontend_hosted_zone_id != "" ? 1 : 0
  zone_id = var.frontend_hosted_zone_id
  name    = var.frontend_custom_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
