data "aws_availability_zones" "available" { state = "available" }


# ----- derive subnet CIDRs and AZ list -----
locals {
  azs              = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  public_subnets   = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]      # public subnet range takes up 16; from 10.0.0.0 to 
  private_subnets  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 16)] #continouting from 10.0.0.
  database_subnets = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 32)]
}


# ----- create vpc + subnets -----
module "vpc" {

  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"
  # enable_internet_gateway = true  --- community vpc module already creates the IGW by default

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs


  # assigning subnets based on defined CIDRs 
  public_subnets   = local.public_subnets   # for ALB
  private_subnets  = local.private_subnets  # for ec2 instances 
  database_subnets = local.database_subnets #rds


  enable_dns_hostnames = true
  enable_dns_support   = true


  # NAT settings
  enable_nat_gateway     = true
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = !var.single_nat_gateway


  create_database_subnet_group = true


  # Cost savers: endpoints to avoid NAT egress
  #  enable_s3_endpoint              = true
  #  enable_dynamodb_endpoint        = true
  #  enable_ecr_api_endpoint         = true
  #  enable_ecr_dkr_endpoint         = true
  #  enable_cloudwatch_logs_endpoint = true
  # enable_ssm_endpoint             = true
  #  enable_ssmmessages_endpoint     = true
  #  enable_ec2messages_endpoint     = true


  tags = local.tags
}