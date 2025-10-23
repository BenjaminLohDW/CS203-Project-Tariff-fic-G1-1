# initialise the tofu project

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}