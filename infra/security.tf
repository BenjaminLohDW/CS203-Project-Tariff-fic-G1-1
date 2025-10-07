# ALB SG – internet to 80/443

# ------------------- security group for alb -------------------
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB security group"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

# port 80 (always) for unencrypted traffic (public subnets)
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}


resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# no restricitons on what goes out (is returned to client)
resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}


# ------------------- ECS tasks - private subnet -------------------
resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs-sg"
  description = "ECS tasks security group"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb_all_tcp" {
  security_group_id             = aws_security_group.ecs.id
  referenced_security_group_id  = aws_security_group.alb.id
  ip_protocol                   = "tcp"
  from_port                     = 0
  to_port                       = 65535
}

#outbound: all
resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}


# DB SG – only from ECS SG on 5432/3306 etc (created in rds.tf when enabled)