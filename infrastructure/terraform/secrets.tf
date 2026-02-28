##############################################################################
# secrets.tf - AWS Secrets Manager for sensitive configuration
##############################################################################

# ------------------------------------------------------------------------------
# Database Credentials
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/db-credentials"
  description = "Database credentials for ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = local.db_username
    password = local.db_password
    host     = local.db_host
    port     = local.db_port
    dbname   = local.db_name
    engine   = "postgres"
  })
}

# ------------------------------------------------------------------------------
# Redis Auth Token
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name        = "${local.name_prefix}/redis-auth-token"
  description = "Redis AUTH token for ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-redis-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = local.redis_auth_token
}

# ------------------------------------------------------------------------------
# JWT Secret
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${local.name_prefix}/jwt-secret"
  description = "JWT signing secret for ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret_generated.result
}

resource "random_password" "jwt_secret_generated" {
  length  = 64
  special = true
}

# ------------------------------------------------------------------------------
# Auth0 Secrets
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "auth_secrets" {
  name        = "${local.name_prefix}/auth-secrets"
  description = "Auth0 secrets for ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-auth-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "auth_secrets" {
  secret_id = aws_secretsmanager_secret.auth_secrets.id

  secret_string = jsonencode({
    client_secret = var.auth0_client_secret
    domain        = var.auth0_domain
    client_id     = var.auth0_client_id
    audience      = var.auth0_audience
  })
}

# ------------------------------------------------------------------------------
# Stripe Secrets
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "stripe_secrets" {
  name        = "${local.name_prefix}/stripe-secrets"
  description = "Stripe API keys for ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-stripe-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "stripe_secrets" {
  secret_id = aws_secretsmanager_secret.stripe_secrets.id

  secret_string = jsonencode({
    secret_key     = var.stripe_secret_key
    webhook_secret = var.stripe_webhook_secret
  })
}

# ------------------------------------------------------------------------------
# CloudFront Signing Key (placeholder - must be replaced with actual key)
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "cloudfront_private_key" {
  name        = "${local.name_prefix}/cloudfront-private-key"
  description = "CloudFront private key for signed URLs in ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-cloudfront-private-key"
  }
}

resource "aws_secretsmanager_secret_version" "cloudfront_private_key" {
  secret_id     = aws_secretsmanager_secret.cloudfront_private_key.id
  secret_string = tls_private_key.cloudfront_signing.private_key_pem
}

resource "aws_secretsmanager_secret" "cloudfront_public_key" {
  name        = "${local.name_prefix}/cloudfront-public-key"
  description = "CloudFront public key for signed URLs in ${local.name_prefix}"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-cloudfront-public-key"
  }
}

resource "aws_secretsmanager_secret_version" "cloudfront_public_key" {
  secret_id     = aws_secretsmanager_secret.cloudfront_public_key.id
  secret_string = tls_private_key.cloudfront_signing.public_key_pem
}

# Generate a key pair for CloudFront signed URLs
resource "tls_private_key" "cloudfront_signing" {
  algorithm = "RSA"
  rsa_bits  = 2048
}
