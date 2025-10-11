# Configure via `tofu init -backend-config` flags or hardcode here.

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}