############################
# output.tf
# Main infrastructure outputs
# all relevant outputs(endpoints) for the project; apis to connect and access the service
############################

# ===== NETWORKING =====

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

# ===== LOAD BALANCER =====

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.public.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 Zone ID"
  value       = aws_lb.public.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.public.arn
}

# ===== FRONTEND =====

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket" {
  description = "S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.bucket
}

# ===== DATABASE =====

output "rds_writer_endpoint" {
  description = "RDS primary (writer) endpoint"
  value       = aws_db_instance.writer.address
}

output "rds_writer_port" {
  description = "RDS port"
  value       = aws_db_instance.writer.port
}

output "rds_reader_endpoint" {
  description = "RDS read replica endpoint (if enabled)"
  value       = var.enable_read_replica ? aws_db_instance.reader[0].address : null
}

output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint (if enabled)"
  value       = var.enable_rds_proxy ? aws_db_proxy.this[0].endpoint : null
}

output "rds_db_name" {
  description = "Database name"
  value       = var.db_name
}

# ===== CACHE =====

output "redis_primary_endpoint" {
  description = "Redis primary endpoint (if enabled)"
  value       = var.enable_redis ? aws_elasticache_replication_group.this[0].primary_endpoint_address : null
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint (if enabled)"
  value       = var.enable_redis ? aws_elasticache_replication_group.this[0].reader_endpoint_address : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_redis ? 6379 : null
}

# ===== ECS =====

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.this.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.this.arn
}

output "ecs_service_names" {
  description = "Map of ECS service names"
  value       = { for k, v in aws_ecs_service.svc : k => v.name }
}

# ===== ECR =====

output "ecr_repo_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repo_name" {
  description = "ECR repository name"
  value       = aws_ecr_repository.app.name
}

# ===== CI/CD =====
# Note: These are also in pipeline.tf, but kept here for convenience

output "codepipeline_name" {
  description = "CodePipeline name"
  value       = aws_codepipeline.this.name
}

output "codestar_connection_arn" {
  description = "CodeStar connection ARN (requires manual activation in console)"
  value       = aws_codestarconnections_connection.github.arn
}

# ===== SECRETS =====

output "db_secret_arn" {
  description = "Secrets Manager secret ARN for database credentials"
  value       = aws_secretsmanager_secret.db.arn
  sensitive   = true
}

# ===== HELPFUL COMMANDS =====

output "helpful_commands" {
  description = "Useful commands for working with this infrastructure"
  sensitive   = true
  value = {
    view_logs          = "aws logs tail /ecs/${local.name_prefix}-<service-name> --follow"
    list_tasks         = "aws ecs list-tasks --cluster ${aws_ecs_cluster.this.name}"
    update_service     = "aws ecs update-service --cluster ${aws_ecs_cluster.this.name} --service <service-name> --force-new-deployment"
    push_to_ecr        = "aws ecr get-login-password | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}"
    connect_to_db      = "psql -h ${var.enable_rds_proxy ? aws_db_proxy.this[0].endpoint : aws_db_instance.writer.address} -U ${var.db_username} -d ${var.db_name}"
    invalidate_cf      = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend.id} --paths '/*'"
    activate_pipeline  = "Visit: https://console.aws.amazon.com/codesuite/settings/connections to activate GitHub connection"
  }
}