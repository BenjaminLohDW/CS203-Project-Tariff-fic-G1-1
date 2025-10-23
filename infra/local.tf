############################
# locals.tf
# Local values used across the infrastructure
############################

locals {
  # Build name prefix from project and environment
  name_prefix = "${var.project_name}-${var.env}"

  # Service definitions

  #public (connects to alb directly; communication with frontend)
  public_services = {
    user     = { path = "/user/*",     port = 5001, health = "/health" }
    history  = { path = "/history/*",  port = 5003, health = "/health" }
    tariff = { path = "/api/tariffs/*", port = 5004, health = "/api/tariffs/health" }
    country  = { path = "/countries/*",  port = 5005, health = "/health" }
    agreement  = { path = "/agreements/*",  port = 5006, health = "/health"}
    forecast   = { path = "/forecast/*",   port = 5007, health = "/health" }
  }

  #internal (can only be acccessed via service discovery)
  internal_services = {
    product  = { path = "/product/*",  port = 5002, health = "/health" }
  }

  # All services combined (for creating ECS tasks, target groups, etc.)
  services = merge(
    local.public_services,
    # Add path for internal services (not used by ALB, but needed for consistency)
    { for k, v in local.internal_services : k => merge(v, { path = "/${k}/*" }) }
  )

  # Default desired count per service (can be overridden in variables)
  desired_counts = {
    user     = 1
    product  = 1
    history  = 1
    tariff   = 1
    country  = 1
    agreement = 1
    forecast = 1
  }

  # Common tags applied to all resources
  tags = {
    Project     = var.project_name
    Environment = var.env
    Owner       = var.owner
    ManagedBy   = "OpenTofu"
  }
}