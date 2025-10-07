############################
# elasticache.tf
############################

variable "enable_redis" { type = bool default = true }

resource "aws_security_group" "redis" {
  count       = var.enable_redis ? 1 : 0
  name        = "${local.name_prefix}-redis-sg"
  description = "ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

# ECS -> Redis:6379
resource "aws_vpc_security_group_ingress_rule" "redis_from_ecs" {
  count                         = var.enable_redis ? 1 : 0
  security_group_id             = aws_security_group.redis[0].id
  referenced_security_group_id  = aws_security_group.ecs.id
  ip_protocol                   = "tcp"
  from_port                     = 6379
  to_port                       = 6379
}

resource "aws_vpc_security_group_egress_rule" "redis_all" {
  count            = var.enable_redis ? 1 : 0
  security_group_id= aws_security_group.redis[0].id
  ip_protocol      = "-1"
  cidr_ipv4        = "0.0.0.0/0"
}

resource "aws_elasticache_subnet_group" "this" {
  count      = var.enable_redis ? 1 : 0
  name       = "${local.name_prefix}-redis-subnets"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_elasticache_replication_group" "this" {
  count                         = var.enable_redis ? 1 : 0
  replication_group_id          = "${local.name_prefix}-redis"
  description                   = "Primary + replica with Multi-AZ"
  engine                        = "redis"
  engine_version                = "7.1"
  node_type                     = "cache.t4g.micro"
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  num_node_groups               = 1
  replicas_per_node_group       = 1
  port                          = 6379

  security_group_ids            = [aws_security_group.redis[0].id]
  subnet_group_name             = aws_elasticache_subnet_group.this[0].name

  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = false

  tags = local.tags
}
