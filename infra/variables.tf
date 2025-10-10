############################
# variables.tf
# Consolidated variable definitions for the entire infrastructure
############################

# ===== PROJECT METADATA =====
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cs203g1t1"
}

variable "env" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "owner" {
  description = "Team or person responsible for infrastructure"
  type        = string
  default     = "team"
}

# ===== AWS CONFIGURATION =====
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-southeast-1"
}

# ===== VPC CONFIGURATION =====
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "AZ count must be 2 or 3 for high availability"
  }
}

variable "single_nat_gateway" {
  description = "Use single NAT gateway (cost saving) vs one per AZ (higher availability)"
  type        = bool
  default     = true
}

# ===== VPC ENDPOINTS =====
variable "enable_endpoints" {
  description = "Enable VPC endpoints to reduce NAT costs"
  type        = bool
  default     = true
}

# ===== SSL/TLS CONFIGURATION =====
variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS. Leave empty for HTTP-only"
  type        = string
  default     = ""
}

# ===== ECR CONFIGURATION =====
variable "ecr_repo_name" {
  description = "ECR repository name (will be suffixed with env)"
  type        = string
  default     = "myapp"
}

# ===== ECS FARGATE CONFIGURATION =====
variable "fargate_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.fargate_cpu)
    error_message = "CPU must be 256, 512, 1024, 2048, or 4096"
  }
}

variable "fargate_memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 512
  validation {
    condition     = var.fargate_memory >= 512 && var.fargate_memory <= 30720
    error_message = "Memory must be between 512 MB and 30720 MB"
  }
}

variable "desired_count" {
  description = "Default desired count of tasks per service"
  type        = number
  default     = 1
}

variable "min_count" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 1
}

variable "max_count" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 3
}

variable "container_image_tag" {
  description = "Container image tag to deploy (e.g., latest, v1.0.0)"
  type        = string
  default     = "latest"
}

# ===== SERVICE DISCOVERY =====
variable "enable_cloud_map" {
  description = "Enable AWS Cloud Map for service discovery"
  type        = bool
  default     = false
}

# ===== RDS DATABASE CONFIGURATION =====
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "appuser"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long"
  }
}

variable "db_instance" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
  validation {
    condition     = var.db_allocated >= 20 && var.db_allocated <= 65536
    error_message = "Storage must be between 20 GB and 65536 GB"
  }
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for primary database (high availability)"
  type        = bool
  default     = true
}

variable "enable_read_replica" {
  description = "Create a read replica for read scaling"
  type        = bool
  default     = true
}

variable "enable_rds_proxy" {
  description = "Enable RDS Proxy for connection pooling"
  type        = bool
  default     = true
}

# ===== ELASTICACHE REDIS CONFIGURATION =====
variable "enable_redis" {
  description = "Enable ElastiCache Redis"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

# ===== CI/CD PIPELINE CONFIGURATION =====
variable "github_owner" {
  description = "GitHub repository owner/organization"
  type        = string
  default     = "BenjaminLohDW"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "CS203Project-G1-1"
}

variable "github_branch" {
  description = "GitHub branch to build from"
  type        = string
  default     = "main"
}

variable "services" {
  description = "List of microservices to build and deploy"
  type        = list(string)
  default     = ["user", "history", "country", "product", "agreement", "tariff"]
  validation {
    condition     = length(var.services) > 0
    error_message = "At least one service must be defined"
  }
}

# ===== FRONTEND CONFIGURATION =====
variable "frontend_domain" {
  description = "Custom domain for CloudFront (optional)"
  type        = string
  default     = ""
}

variable "frontend_acm_arn" {
  description = "ACM certificate ARN for CloudFront custom domain (must be in us-east-1)"
  type        = string
  default     = ""
}