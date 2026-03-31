##############################################################################
# main.tf - Provider configuration, S3 backend, data sources
##############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "nexly-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "nexly-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Secondary provider for CloudFront ACM certificates (must be us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

##############################################################################
# Data Sources
##############################################################################

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# ACM certificate for the domain (must exist in us-east-1 for CloudFront)
data "aws_acm_certificate" "cloudfront" {
  provider    = aws.us_east_1
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
  count       = var.create_dns_zone ? 0 : 1
}

# ACM certificate for ALB (regional)
data "aws_acm_certificate" "alb" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
  count       = var.create_dns_zone ? 0 : 1
}

##############################################################################
# Random resources for unique naming
##############################################################################

resource "random_password" "db_password" {
  length  = 32
  special = true
  # Exclude characters that cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "redis_auth_token" {
  length           = 64
  special          = true
  override_special = "!&#$^<>-"
}

resource "random_id" "suffix" {
  byte_length = 4
}

##############################################################################
# Local values
##############################################################################

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Container ports
  api_port    = 4000
  web_port    = 3000
  worker_port = 4001

  # Database connection string components
  db_host     = aws_db_instance.main.address
  db_port     = aws_db_instance.main.port
  db_name     = var.db_name
  db_username = var.db_username
  db_password = random_password.db_password.result

  # Redis connection components
  redis_host       = aws_elasticache_replication_group.main.primary_endpoint_address
  redis_port       = 6379
  redis_auth_token = random_password.redis_auth_token.result

  # ALB DNS
  alb_certificate_arn        = var.create_dns_zone ? aws_acm_certificate.alb[0].arn : data.aws_acm_certificate.alb[0].arn
  cloudfront_certificate_arn = var.create_dns_zone ? aws_acm_certificate.cloudfront[0].arn : data.aws_acm_certificate.cloudfront[0].arn
}
