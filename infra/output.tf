############################
# outputs.tf
############################

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "cloudfront_domain" {
  value       = try(aws_cloudfront_distribution.site.domain_name, null)
  description = "Frontend distribution (if configured)"
}

output "rds_writer_endpoint" {
  value = aws_db_instance.writer.address
}

output "rds_reader_endpoint" {
  value = try(aws_db_instance.reader[0].address, null)
}

output "rds_proxy_endpoint" {
  value = try(aws_db_proxy.this[0].endpoint, null)
}

output "redis_primary_endpoint" {
  value = try(aws_elasticache_replication_group.this[0].primary_endpoint_address, null)
}

output "ecr_repo_url" {
  value = aws_ecr_repository.app.repository_url
}
