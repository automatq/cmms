##############################################################################
# outputs.tf - Key infrastructure outputs
##############################################################################

# ------------------------------------------------------------------------------
# VPC
# ------------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

# ------------------------------------------------------------------------------
# ALB
# ------------------------------------------------------------------------------

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

# ------------------------------------------------------------------------------
# CloudFront
# ------------------------------------------------------------------------------

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "app_url" {
  description = "Primary application URL"
  value       = "https://${var.domain_name}"
}

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_host" {
  description = "RDS PostgreSQL host"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

# ------------------------------------------------------------------------------
# Redis
# ------------------------------------------------------------------------------

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = local.redis_port
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
}

# ------------------------------------------------------------------------------
# S3
# ------------------------------------------------------------------------------

output "s3_bucket_name" {
  description = "Name of the S3 files bucket"
  value       = aws_s3_bucket.files.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 files bucket"
  value       = aws_s3_bucket.files.arn
}

# ------------------------------------------------------------------------------
# ECR
# ------------------------------------------------------------------------------

output "ecr_api_repository_url" {
  description = "ECR repository URL for the API service"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_worker_repository_url" {
  description = "ECR repository URL for the worker service"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecr_web_repository_url" {
  description = "ECR repository URL for the web service"
  value       = aws_ecr_repository.web.repository_url
}

# ------------------------------------------------------------------------------
# ECS
# ------------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_api_service_name" {
  description = "Name of the API ECS service"
  value       = aws_ecs_service.api.name
}

output "ecs_worker_service_name" {
  description = "Name of the worker ECS service"
  value       = aws_ecs_service.worker.name
}

output "ecs_web_service_name" {
  description = "Name of the web ECS service"
  value       = aws_ecs_service.web.name
}

# ------------------------------------------------------------------------------
# DNS
# ------------------------------------------------------------------------------

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = local.zone_id
}

output "route53_nameservers" {
  description = "Route 53 nameservers (only populated when zone is created)"
  value       = var.create_dns_zone ? aws_route53_zone.main[0].name_servers : []
}

# ------------------------------------------------------------------------------
# SES
# ------------------------------------------------------------------------------

output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

# ------------------------------------------------------------------------------
# Secrets Manager ARNs
# ------------------------------------------------------------------------------

output "secrets_db_credentials_arn" {
  description = "ARN of DB credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_auth_arn" {
  description = "ARN of auth secrets"
  value       = aws_secretsmanager_secret.auth_secrets.arn
}

output "secrets_stripe_arn" {
  description = "ARN of Stripe secrets"
  value       = aws_secretsmanager_secret.stripe_secrets.arn
}

output "secrets_jwt_arn" {
  description = "ARN of JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

# ------------------------------------------------------------------------------
# Monitoring
# ------------------------------------------------------------------------------

output "cloudwatch_log_group_api" {
  description = "CloudWatch log group name for the API service"
  value       = aws_cloudwatch_log_group.api.name
}

output "cloudwatch_log_group_worker" {
  description = "CloudWatch log group name for the worker service"
  value       = aws_cloudwatch_log_group.worker.name
}

output "cloudwatch_log_group_web" {
  description = "CloudWatch log group name for the web service"
  value       = aws_cloudwatch_log_group.web.name
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_alarm_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = local.sns_topic_arn
}
