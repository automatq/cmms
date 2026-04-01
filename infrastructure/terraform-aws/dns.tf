##############################################################################
# dns.tf - Route 53 hosted zone and DNS records
##############################################################################

# ------------------------------------------------------------------------------
# Route 53 Hosted Zone
# ------------------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  count = var.create_dns_zone ? 1 : 0

  name    = var.domain_name
  comment = "Managed by Terraform for ${local.name_prefix}"

  tags = {
    Name = "${local.name_prefix}-zone"
  }
}

locals {
  zone_id = var.create_dns_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.existing[0].zone_id
}

# Data source for existing zone (when create_dns_zone = false)
data "aws_route53_zone" "existing" {
  count = var.create_dns_zone ? 0 : 1
  name  = var.domain_name
}

# ------------------------------------------------------------------------------
# ACM Certificate (created when create_dns_zone = true)
# ------------------------------------------------------------------------------

# Regional certificate for ALB
resource "aws_acm_certificate" "alb" {
  count = var.create_dns_zone ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${local.name_prefix}-alb-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront certificate (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  count    = var.create_dns_zone ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${local.name_prefix}-cloudfront-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records for ALB certificate
resource "aws_route53_record" "acm_validation" {
  for_each = var.create_dns_zone ? {
    for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "alb" {
  count = var.create_dns_zone ? 1 : 0

  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

resource "aws_acm_certificate_validation" "cloudfront" {
  count    = var.create_dns_zone ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.cloudfront[0].arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# ------------------------------------------------------------------------------
# DNS Records
# ------------------------------------------------------------------------------

# Root domain -> CloudFront
resource "aws_route53_record" "root" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# ALB record (internal, used by CloudFront origin)
resource "aws_route53_record" "alb" {
  zone_id = local.zone_id
  name    = "alb.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
