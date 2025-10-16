resource "aws_ecr_repository" "app" {
  name                 = "${var.ecr_repo_name}-${var.env}"
  image_tag_mutability = "MUTABLE"
  force_delete = true

  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
  tags = local.tags
}

resource "aws_ecr_lifecycle_policy" "expire_untagged" {
  repository = aws_ecr_repository.app.name
  policy     = <<POLICY
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images after 14 days",
      "selection": {"tagStatus": "untagged", "countType": "sinceImagePushed", "countNumber": 14, "countUnit": "days"},
      "action": {"type": "expire"}
    }
  ]
}
POLICY
}