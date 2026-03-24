
locals {
  use_custom_domain = var.domain_name != ""
  use_acm_existing  = var.acm_certificate_arn != ""
}

resource "aws_acm_certificate" "this" {
  count             = local.use_custom_domain && var.enable_https && !local.use_acm_existing ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
  tags              = local.tags
}

resource "aws_route53_record" "acm_validation" {
  count   = length(aws_acm_certificate.this) > 0 ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = aws_acm_certificate.this[0].domain_validation_options[0].resource_record_name
  type    = aws_acm_certificate.this[0].domain_validation_options[0].resource_record_type
  ttl     = 60
  records = [aws_acm_certificate.this[0].domain_validation_options[0].resource_record_value]
}

resource "aws_acm_certificate_validation" "this" {
  count                   = length(aws_acm_certificate.this) > 0 ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [aws_route53_record.acm_validation[0].fqdn]
}

locals {
  acm_arn_effective = local.use_acm_existing ? var.acm_certificate_arn : (length(aws_acm_certificate_validation.this) > 0 ? aws_acm_certificate_validation.this[0].certificate_arn : "")
}

# HTTP -> HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  count             = var.enable_https && local.acm_arn_effective != "" ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.enable_https && local.acm_arn_effective != "" ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = local.acm_arn_effective

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# Optional API DNS record
resource "aws_route53_record" "api_a" {
  count   = local.use_custom_domain && var.hosted_zone_id != "" ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}
