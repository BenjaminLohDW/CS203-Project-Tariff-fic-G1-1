resource "aws_cloudwatch_log_group" "svc" {
  for_each = local.services
  name     = "/ecs/${local.name_prefix}-${each.key}"
  retention_in_days = 14
  tags = local.tags
}