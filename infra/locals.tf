############################
# locals.tf
# Local values used across the infrastructure
############################

locals {
  # Build name prefix from project and environment
  name_prefix = "${var.project_name}-${var.env}"

  # Service definitions - MUST match your actual microservices
  # Each service needs a unique port and path prefix
  services = {
    user     = { path = "/user/*",     port = 5001, health = "/health" }
    product  = { path = "/product/*",  port = 5002, }
    history  = { path = "/history/*",  port = 5003, health = "/health" }
    forecast = { path = "/forecast/*", port = 5004}
    country  = { path = "/countries/*",  port = 5005, health = "/health" }
    tariff   = { path = "/tariff/*",   port = 5006}
  }

  # Default desired count per service (can be overridden in variables)
  desired_counts = {
    user     = 1
    history  = 1
    country  = 1
    product  = 1
    forecast = 1
    tariff   = 1
  }

  # Common tags applied to all resources
  tags = {
    Project     = var.project_name
    Environment = var.env
    Owner       = var.owner
    ManagedBy   = "OpenTofu"
  }
}