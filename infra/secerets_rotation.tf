# # secrets_rotation.tf
# # Automatic rotation of database credentials


# variable "enable_secrets_rotation" {
#     description = "Enable automatic rotation of database secrets"
#     type        = bool
#     default     = false  # Enable after initial setup
# }

# # Lambda function for secrets rotation
# resource "aws_lambda_function" "rotate_secret" {
#     count         = var.enable_secrets_rotation ? 1 : 0
#     filename      = "lambda_rotation.zip"  # You'll need to create this
#     function_name = "${local.name_prefix}-rotate-db-secret"
#     role          = aws_iam_role.secrets_rotation[0].arn
#     handler       = "index.handler"
#     runtime       = "python3.9"
#     timeout       = 30
    
#     vpc_config {
#         subnet_ids         = module.vpc.private_subnets
#         security_group_ids = [aws_security_group.lambda_rotation[0].id]
#     }
    
#     environment {
#         variables = {
#         SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
#         }
#     }
    
#     tags = local.tags
# }

# # Rotation schedule
# resource "aws_secretsmanager_secret_rotation" "db" {
#     count               = var.enable_secrets_rotation ? 1 : 0
#     secret_id           = aws_secretsmanager_secret.db.id
#     rotation_lambda_arn = aws_lambda_function.rotate_secret[0].arn
    
#     rotation_rules {
#         automatically_after_days = 30
#     }
# }

# # IAM role for rotation Lambda
# resource "aws_iam_role" "secrets_rotation" {
#     count = var.enable_secrets_rotation ? 1 : 0
#     name  = "${local.name_prefix}-secrets-rotation-role"
    
#     assume_role_policy = jsonencode({
#         Version = "2012-10-17"
#         Statement = [{
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#             Service = "lambda.amazonaws.com"
#         }
#         }]
#     })
    
#     tags = local.tags
# }

# # Security group for Lambda
# resource "aws_security_group" "lambda_rotation" {
#     count       = var.enable_secrets_rotation ? 1 : 0
#     name        = "${local.name_prefix}-lambda-rotation-sg"
#     description = "Security group for secrets rotation Lambda"
#     vpc_id      = module.vpc.vpc_id
    
#     egress {
#         from_port   = 0
#         to_port     = 0
#         protocol    = "-1"
#         cidr_blocks = ["0.0.0.0/0"]
#     }
    
#     tags = local.tags
# }