#security group that allows ecs to talk to postgres (port 5432)
resource "aws_security_group" "rds" {
    name = "${local.name_prefix}-rds-sg"
    description = "RDS Postgres"
    vpc_id = module.vpc.vpc_id
    tags = local.tags
}


# allow ECS -> RDS:5432
resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.ecs.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}


# egress all (response)
resource "aws_vpc_security_group_egress_rule" "rds_all" {
  security_group_id = aws_security_group.rds.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}


# Allow RDS Proxy -> RDS (if proxy is enabled)
resource "aws_vpc_security_group_ingress_rule" "rds_from_proxy" {
  count                        = var.enable_rds_proxy ? 1 : 0
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.rds_proxy[0].id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "Allow RDS Proxy to connect to RDS"
}


# Subnet group in your database subnets
resource "aws_db_subnet_group" "this" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = module.vpc.database_subnets
  tags       = local.tags
}


# Primary writer
resource "aws_db_instance" "writer" {
  identifier                 = "${local.name_prefix}-pg-writer"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = var.db_instance
  db_subnet_group_name       = aws_db_subnet_group.this.name
  multi_az                   = var.db_multi_az
  allocated_storage          = var.db_allocated
  storage_type               = "gp3"
  publicly_accessible        = false
  vpc_security_group_ids     = [aws_security_group.rds.id]
  delete_automated_backups   = false
  deletion_protection        = false

  db_name                    = var.db_name
  username                   = var.db_username
  password                   = var.db_password

  backup_retention_period    = 7
  auto_minor_version_upgrade = true
  skip_final_snapshot = true

  tags = local.tags
}


# Optional read replica
resource "aws_db_instance" "reader" {
  count                      = var.enable_read_replica ? 1 : 0
  identifier                 = "${local.name_prefix}-pg-replica"
  replicate_source_db        = aws_db_instance.writer.arn
  engine                     = "postgres"
  instance_class             = var.db_instance
  # db_subnet_group_name       = aws_db_subnet_group.this.name
  publicly_accessible        = false
  # vpc_security_group_ids     = [aws_security_group.rds.id]
  auto_minor_version_upgrade = true
  skip_final_snapshot = true
  tags = local.tags
}