############################
# endpoints.tf
############################

# S3 Gateway endpoint (works across the whole VPC)
resource "aws_vpc_endpoint" "s3" {
  count             = var.enable_endpoints ? 1 : 0
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
  tags              = local.tags
}

# Common interface endpoints to cut NAT use: ECR (api+dkr), CW Logs, Secrets
locals {
  interface_endpoints = [
    "ecr.api",
    "ecr.dkr",
    "logs",
    "secretsmanager"
  ]
}

resource "aws_vpc_endpoint" "interfaces" {
  for_each          = var.enable_endpoints ? toset(local.interface_endpoints) : []
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.${each.key}"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids= [aws_security_group.endpoints[0].id]
  private_dns_enabled = true
  tags              = local.tags
}
