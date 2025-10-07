############################
# rds_proxy.tf
############################

variable "enable_rds_proxy" { type = bool default = true }

# IAM role for RDS Proxy to read Secrets Manager
resource "aws_iam_role" "rds_proxy" {
  name               = "${local.name_prefix}-rds-proxy-role"
  assume_role_policy = data.aws_iam_policy_document.rds_proxy_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "rds_proxy_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service" identifiers = ["rds.amazonaws.com"] }
  }
}

resource "aws_iam_role_policy_attachment" "rds_proxy_secrets" {
  role       = aws_iam_role.rds_proxy.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

# Secret that holds the DB creds (username/password)
resource "aws_secretsmanager_secret" "db" {
  name = "${local.name_prefix}/db/credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({ username = var.db_username, password = var.db_password })
}

# Security group for proxy (ECS -> Proxy ; Proxy -> RDS)
resource "aws_security_group" "rds_proxy" {
  name        = "${local.name_prefix}-rds-proxy-sg"
  description = "RDS Proxy"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

# ECS can hit proxy:5432
resource "aws_vpc_security_group_ingress_rule" "proxy_from_ecs" {
  security_group_id            = aws_security_group.rds_proxy.id
  referenced_security_group_id = aws_security_group.ecs.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

# Proxy can hit DB:5432
resource "aws_vpc_security_group_egress_rule" "proxy_to_rds" {
  security_group_id = aws_security_group.rds_proxy.id
  ip_protocol       = "tcp"
  to_port           = 5432
  from_port         = 5432
  referenced_security_group_id = aws_security_group.rds.id
}

# Proxy target group for RDS writer
resource "aws_db_proxy" "this" {
  count                     = var.enable_rds_proxy ? 1 : 0
  name                      = "${local.name_prefix}-pg-proxy"
  engine_family             = "POSTGRESQL"
  role_arn                  = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids            = module.vpc.database_subnets
  vpc_security_group_ids    = [aws_security_group.rds_proxy.id]
  require_tls               = true
  idle_client_timeout       = 1800
  debug_logging             = false
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db.arn
    iam_auth    = "DISABLED"
  }
  tags = local.tags
}

resource "aws_db_proxy_default_target_group" "this" {
  count       = var.enable_rds_proxy ? 1 : 0
  db_proxy_name = aws_db_proxy.this[0].name
}

resource "aws_db_proxy_target" "writer" {
  count            = var.enable_rds_proxy ? 1 : 0
  db_proxy_name    = aws_db_proxy.this[0].name
  target_group_name= aws_db_proxy_default_target_group.this[0].name
  db_instance_identifier = aws_db_instance.writer.id
}
