# WAFv2 Web ACLs with managed + custom rules.
# - ALB scope: REGIONAL
# - CloudFront scope: CLOUDFRONT (must be created in us-east-1 provider alias aws.use1)

locals {
  waf_has_allowlist = length(var.waf_allow_ip_cidrs) > 0
  waf_has_blocklist = length(var.waf_block_ip_cidrs) > 0
  waf_has_geo_block = length(var.waf_block_countries) > 0
}

resource "aws_wafv2_ip_set" "allow" {
  count              = var.enable_waf && local.waf_has_allowlist ? 1 : 0
  name               = "${local.name}-waf-allow"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.waf_allow_ip_cidrs
  tags               = local.tags
}

resource "aws_wafv2_ip_set" "block" {
  count              = var.enable_waf && local.waf_has_blocklist ? 1 : 0
  name               = "${local.name}-waf-block"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.waf_block_ip_cidrs
  tags               = local.tags
}

resource "aws_wafv2_ip_set" "allow_cf" {
  provider           = aws.use1
  count              = var.enable_waf && local.waf_has_allowlist ? 1 : 0
  name               = "${local.name}-waf-allow-cf"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.waf_allow_ip_cidrs
  tags               = local.tags
}

resource "aws_wafv2_ip_set" "block_cf" {
  provider           = aws.use1
  count              = var.enable_waf && local.waf_has_blocklist ? 1 : 0
  name               = "${local.name}-waf-block-cf"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.waf_block_ip_cidrs
  tags               = local.tags
}

resource "aws_wafv2_web_acl" "alb" {
  count = var.enable_waf ? 1 : 0
  name  = "${local.name}-alb-waf"
  scope = "REGIONAL"

  default_action { allow {} }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-alb-waf"
    sampled_requests_enabled   = true
  }

  # Highest priority: allowlist (optional)
  dynamic "rule" {
    for_each = local.waf_has_allowlist ? [1] : []
    content {
      name     = "AllowList"
      priority = 0
      action { allow {} }
      statement {
        ip_set_reference_statement { arn = aws_wafv2_ip_set.allow[0].arn }
      }
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AllowList"
        sampled_requests_enabled   = true
      }
    }
  }

  # Blocklist (optional)
  dynamic "rule" {
    for_each = local.waf_has_blocklist ? [1] : []
    content {
      name     = "BlockList"
      priority = 1
      action { block {} }
      statement {
        ip_set_reference_statement { arn = aws_wafv2_ip_set.block[0].arn }
      }
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "BlockList"
        sampled_requests_enabled   = true
      }
    }
  }

  # Geo block (optional)
  dynamic "rule" {
    for_each = local.waf_has_geo_block ? [1] : []
    content {
      name     = "GeoBlock"
      priority = 2
      action { block {} }
      statement {
        geo_match_statement { country_codes = var.waf_block_countries }
      }
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "GeoBlock"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimit"
    priority = 3
    action { block {} }
    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Managed rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "CommonRuleSet" sampled_requests_enabled = true }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 11
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "KnownBadInputs" sampled_requests_enabled = true }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 12
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "SQLi" sampled_requests_enabled = true }
  }

  tags = local.tags
}

resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.enable_waf ? 1 : 0
  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.alb[0].arn
}

resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.use1
  count    = var.enable_waf ? 1 : 0
  name     = "${local.name}-cf-waf"
  scope    = "CLOUDFRONT"

  default_action { allow {} }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-cf-waf"
    sampled_requests_enabled   = true
  }

  dynamic "rule" {
    for_each = local.waf_has_allowlist ? [1] : []
    content {
      name     = "AllowList"
      priority = 0
      action { allow {} }
      statement { ip_set_reference_statement { arn = aws_wafv2_ip_set.allow_cf[0].arn } }
      visibility_config { cloudwatch_metrics_enabled = true metric_name = "AllowList" sampled_requests_enabled = true }
    }
  }

  dynamic "rule" {
    for_each = local.waf_has_blocklist ? [1] : []
    content {
      name     = "BlockList"
      priority = 1
      action { block {} }
      statement { ip_set_reference_statement { arn = aws_wafv2_ip_set.block_cf[0].arn } }
      visibility_config { cloudwatch_metrics_enabled = true metric_name = "BlockList" sampled_requests_enabled = true }
    }
  }

  dynamic "rule" {
    for_each = local.waf_has_geo_block ? [1] : []
    content {
      name     = "GeoBlock"
      priority = 2
      action { block {} }
      statement { geo_match_statement { country_codes = var.waf_block_countries } }
      visibility_config { cloudwatch_metrics_enabled = true metric_name = "GeoBlock" sampled_requests_enabled = true }
    }
  }

  rule {
    name     = "RateLimit"
    priority = 3
    action { block {} }
    statement {
      rate_based_statement { limit = var.waf_rate_limit aggregate_key_type = "IP" }
    }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "RateLimit" sampled_requests_enabled = true }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet" vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "CommonRuleSet" sampled_requests_enabled = true }
  }

  tags = local.tags
}
