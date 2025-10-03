variable "project_name" {
  type    = string
  default = "cs203g1t1"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "owner" {
  type    = string
  default = "team"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "single_nat_gateway" {
  type    = bool
  default = true
}

# Leave empty for HTTP-only; set to your ACM cert ARN to enable HTTPS
variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "ecr_repo_name" {
  type    = string
  default = "myapp"
}

variable "container_name" {
  type    = string
  default = "web"
}

variable "container_port" {
  type    = number
  default = 8080
}

# Change after pushing an image to ECR
variable "container_image_tag" {
  type    = string
  default = "latest"
}

variable "fargate_cpu" {
  type    = number
  default = 256 # 0.25 vCPU
}

variable "fargate_memory" {
  type    = number
  default = 512 # MB
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "min_count" {
  type    = number
  default = 1
}

variable "max_count" {
  type    = number
  default = 3
}

variable "enable_cloud_map" {
  type    = bool
  default = false
}

# RDS (optional)
variable "enable_rds" {
  type    = bool
  default = false
}

variable "db_engine" {
  type    = string
  default = "postgres"
}

variable "db_engine_ver" {
  type    = string
  default = "15"
}

variable "db_instance" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "appdb"
}

variable "db_username" {
  type    = string
  default = "appuser"
}
