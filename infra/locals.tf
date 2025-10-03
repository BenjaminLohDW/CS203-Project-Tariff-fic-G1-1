locals {
  #build name prefix 
  name_prefix = "${var.project_name}-${var.env}"

  # container for each service
  services = {
    user = { path = "/user/*",    port = 8000, health = "/health" }
    history = { path = "/history/*", port = 8001, health = "/health" }
    country = { path = "/country/*", port = 8002, health = "/health" }
    product = { path = "/product/*", port = 8003, health = "/product" }
    tariff  = { path = "/tariff/*",  port = 8003, health = "/health" }
  }

  tags = {
    Project = var.project_name
    Env     = var.env
    Owner   = var.owner
  }

  # Optional default desired count per service
  desired_counts = {
    user = 1
    history = 1
    country = 1
    product = 1
    tariff = 1
  }
}