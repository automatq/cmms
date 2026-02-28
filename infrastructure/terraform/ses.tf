##############################################################################
# ses.tf - SES domain verification and email configuration
##############################################################################

locals {
  ses_domain = var.ses_domain != "" ? var.ses_domain : var.domain_name
}

# ------------------------------------------------------------------------------
# SES Domain Identity
# ------------------------------------------------------------------------------

resource "aws_ses_domain_identity" "main" {
  domain = local.ses_domain
}

# ------------------------------------------------------------------------------
# SES Domain Verification (Route 53 DNS records)
# ------------------------------------------------------------------------------

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.domain

  depends_on = [aws_route53_record.ses_verification]
}

# ------------------------------------------------------------------------------
# SES DKIM
# ------------------------------------------------------------------------------

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# ------------------------------------------------------------------------------
# SES MAIL FROM Domain
# ------------------------------------------------------------------------------

resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${local.ses_domain}"
}

# ------------------------------------------------------------------------------
# SES Configuration Set (for tracking bounces, complaints)
# ------------------------------------------------------------------------------

resource "aws_ses_configuration_set" "main" {
  name = "${local.name_prefix}-email-config"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_metrics_enabled = true
}

# ------------------------------------------------------------------------------
# SES Event Destination (CloudWatch for metrics)
# ------------------------------------------------------------------------------

resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "${local.name_prefix}-email-metrics"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = [
    "bounce",
    "complaint",
    "delivery",
    "reject",
    "send",
  ]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:configuration-set"
    value_source   = "messageTag"
  }
}

# ------------------------------------------------------------------------------
# DNS Records for SES Verification
# ------------------------------------------------------------------------------

resource "aws_route53_record" "ses_verification" {
  count   = var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "_amazonses.${local.ses_domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# DKIM records
resource "aws_route53_record" "ses_dkim" {
  count   = var.create_dns_zone ? 3 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${local.ses_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# MAIL FROM MX record
resource "aws_route53_record" "ses_mail_from_mx" {
  count   = var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "mail.${local.ses_domain}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

# MAIL FROM SPF record
resource "aws_route53_record" "ses_mail_from_spf" {
  count   = var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "mail.${local.ses_domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

# DMARC record
resource "aws_route53_record" "ses_dmarc" {
  count   = var.create_dns_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "_dmarc.${local.ses_domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@${local.ses_domain}"]
}
