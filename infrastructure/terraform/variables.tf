##############################################################################
# variables.tf - All input variables with sensible defaults
##############################################################################

# ------------------------------------------------------------------------------
# General
# ------------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the project, used as prefix for all resources"
  type        = string
  default     = "nexly"
}

variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

# ------------------------------------------------------------------------------
# Networking
# ------------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# ------------------------------------------------------------------------------
# Domain / DNS
# ------------------------------------------------------------------------------

variable "domain_name" {
  description = "Root domain name (e.g. nexly.example.com)"
  type        = string
}

variable "create_dns_zone" {
  description = "Whether to create Route 53 zone and ACM certificates (set false if they already exist)"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# Database (RDS)
# ------------------------------------------------------------------------------

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "nexly"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "nexly_admin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage for auto-scaling in GB"
  type        = number
  default     = 100
}

variable "db_backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# ElastiCache (Redis)
# ------------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters (nodes) in the replication group"
  type        = number
  default     = 2
}

# ------------------------------------------------------------------------------
# S3
# ------------------------------------------------------------------------------

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for file storage (must be globally unique)"
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# ECS / Fargate
# ------------------------------------------------------------------------------

variable "api_cpu" {
  description = "CPU units for the API task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory in MB for the API task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2
}

variable "api_min_count" {
  description = "Minimum number of API tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "api_max_count" {
  description = "Maximum number of API tasks for auto-scaling"
  type        = number
  default     = 6
}

variable "worker_cpu" {
  description = "CPU units for the worker task"
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "Memory in MB for the worker task"
  type        = number
  default     = 1024
}

variable "worker_desired_count" {
  description = "Desired number of worker tasks"
  type        = number
  default     = 1
}

variable "worker_min_count" {
  description = "Minimum number of worker tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "worker_max_count" {
  description = "Maximum number of worker tasks for auto-scaling"
  type        = number
  default     = 4
}

variable "web_cpu" {
  description = "CPU units for the web (Next.js) task"
  type        = number
  default     = 512
}

variable "web_memory" {
  description = "Memory in MB for the web task"
  type        = number
  default     = 1024
}

variable "web_desired_count" {
  description = "Desired number of web tasks"
  type        = number
  default     = 2
}

variable "web_min_count" {
  description = "Minimum number of web tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "web_max_count" {
  description = "Maximum number of web tasks for auto-scaling"
  type        = number
  default     = 6
}

# ------------------------------------------------------------------------------
# Container Image Tags
# ------------------------------------------------------------------------------

variable "api_image_tag" {
  description = "Docker image tag for the API service"
  type        = string
  default     = "latest"
}

variable "worker_image_tag" {
  description = "Docker image tag for the worker service"
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  description = "Docker image tag for the web service"
  type        = string
  default     = "latest"
}

# ------------------------------------------------------------------------------
# Clerk
# ------------------------------------------------------------------------------

variable "clerk_secret_key" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key"
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# Secrets (sensitive - pass via tfvars or environment)
# ------------------------------------------------------------------------------

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
  default     = ""
}


variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

# ------------------------------------------------------------------------------
# SES / Email
# ------------------------------------------------------------------------------

variable "ses_domain" {
  description = "Domain to verify for SES email sending (defaults to domain_name)"
  type        = string
  default     = ""
}

variable "ses_from_email" {
  description = "Default from email address"
  type        = string
  default     = "noreply@example.com"
}

# ------------------------------------------------------------------------------
# Monitoring
# ------------------------------------------------------------------------------

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarm notifications (optional, one is created if empty)"
  type        = string
  default     = ""
}

variable "alarm_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# Auto-scaling thresholds
# ------------------------------------------------------------------------------

variable "scaling_cpu_target" {
  description = "Target CPU utilization percentage for auto-scaling"
  type        = number
  default     = 70
}

variable "scaling_memory_target" {
  description = "Target memory utilization percentage for auto-scaling"
  type        = number
  default     = 80
}
