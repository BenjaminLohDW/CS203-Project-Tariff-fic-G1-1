
#ecs.tf => cluster definition and IAM roles for tasks
#single ecs cluster for all services (scaling the clusters, not the services)

resource "aws_ecs_cluster" "this" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.tags
}

# ======= IAM roles for tasks =======

# Task Execution Role (pulls images, writes logs, reads secrets)
data "aws_iam_policy_document" "task_execution_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${local.name_prefix}-task-exec-role"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume.json
  tags               = local.tags
}

# Standard ECS task execution permissions
resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional permission to read Secrets Manager (for DB password)
data "aws_iam_policy_document" "task_execution_secrets" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      aws_secretsmanager_secret.db.arn,
      aws_secretsmanager_secret.firebase_credentials.arn
    ]
  }
}

resource "aws_iam_policy" "task_execution_secrets" {
  name        = "${local.name_prefix}-task-exec-secrets"
  description = "Allow ECS tasks to read Secrets Manager"
  policy      = data.aws_iam_policy_document.task_execution_secrets.json
}

resource "aws_iam_role_policy_attachment" "task_execution_secrets" {
  role       = aws_iam_role.task_execution.name
  policy_arn = aws_iam_policy.task_execution_secrets.arn
}


# ===== TASK ROLE (runtime permissions for the application) =====

resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-task-role"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume.json
  tags               = local.tags
}

# Example: Allow tasks to write CloudWatch metrics (if needed)
data "aws_iam_policy_document" "task_runtime" {
  # CloudWatch Metrics
  statement {
    actions = [
      "cloudwatch:PutMetricData"
    ]
    resources = ["*"]
  }

  # S3 access (if your services need to read/write S3)
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::${local.name_prefix}-*",
      "arn:aws:s3:::${local.name_prefix}-*/*"
    ]
  }

  # Optional: SQS, SNS, or other AWS service permissions
  # Add more statements as needed for your application
}

resource "aws_iam_policy" "task_runtime" {
  name        = "${local.name_prefix}-task-runtime"
  description = "Runtime permissions for ECS tasks"
  policy      = data.aws_iam_policy_document.task_runtime.json
}

resource "aws_iam_role_policy_attachment" "task_runtime" {
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.task_runtime.arn
}