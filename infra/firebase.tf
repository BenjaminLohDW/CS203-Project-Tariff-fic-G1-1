############################
# firebase.tf
# Firebase credentials management for JWT authentication
############################

# Store Firebase service account credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "firebase_credentials" {
  name        = "${local.name_prefix}-firebase-credentials"
  description = "Firebase service account credentials for JWT authentication"
  
  recovery_window_in_days = 7  # Allow 7 days to recover if accidentally deleted
  
  tags = local.tags
}

# Store the actual credentials
# IMPORTANT: Place your firebase-credentials.json in the same directory as this file
# Add firebase-credentials.json to .gitignore to prevent committing secrets!
resource "aws_secretsmanager_secret_version" "firebase_credentials" {
  secret_id     = aws_secretsmanager_secret.firebase_credentials.id
  secret_string = file("${path.module}/firebase-credentials.json")
  
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Output the secret ARN for reference
output "firebase_secret_arn" {
  description = "ARN of the Firebase credentials secret"
  value       = aws_secretsmanager_secret.firebase_credentials.arn
  sensitive   = true
}
