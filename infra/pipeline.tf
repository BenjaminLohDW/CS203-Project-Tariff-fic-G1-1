############################
# pipeline.tf
# CI/CD Pipeline: GitHub -> CodeBuild -> ECR -> ECS
############################
#update 1.1.0 10/11/2025: changed codebuild logic to build services parallelly instead of sequentially; added caching

# ================= CodeStar GitHub Connection =================
resource "aws_codestarconnections_connection" "github" {
  name          = "${local.name_prefix}-github"
  provider_type = "GitHub"
  tags          = local.tags
}

# ================= Artifact bucket for CodePipeline =================
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket        = "${local.name_prefix}-cp-artifacts"
  force_destroy = true
  tags          = local.tags
}

resource "aws_s3_bucket_versioning" "cp_artifacts_versioning" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cp_artifacts_sse" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cp_artifacts_pab" {
  bucket                  = aws_s3_bucket.codepipeline_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
  ignore_public_acls      = true
}

# ================= 1. Codebuild: define IAM roles and permissions =================
data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name               = "${local.name_prefix}-codebuild-role"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume.json
  tags               = local.tags
}

# Permissions for CodeBuild
resource "aws_iam_role_policy_attachment" "codebuild_ecr" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy_attachment" "codebuild_logs" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_iam_role_policy_attachment" "codebuild_s3" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}


# ================= 2. CodeBuild Project: actual packaging of images into services (backend and frontend) =================
resource "aws_codebuild_project" "build" {
  for_each = toset(var.services)
  name         = "${local.name_prefix}-build-${each.value}"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  # defined the build stages in buildspec.yml
  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec.yml"  # Add this line - specify the path to your buildspec
  }

  #added caching so that coudebuild does not build images from scratch; uses previous docker layers for common base images
  cache {
    type = "LOCAL"
    modes = ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }

  environment {
    type            = "LINUX_CONTAINER"
    image           = "aws/codebuild/standard:7.0"
    compute_type    = "BUILD_GENERAL1_SMALL"
    privileged_mode = true # Required for Docker

    # Environment variables passed to buildspec
    environment_variable {
      name  = "ECR_REPO"
      value = aws_ecr_repository.app.repository_url
    }
    environment_variable {
      name  = "SERVICE"
      value = each.value
    }
    environment_variable {
      name  = "IMAGE_TAG"
      value = var.container_image_tag
    }
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.name_prefix}"
      stream_name = "build"
    }
  }
  tags = local.tags
}

resource "aws_codebuild_project" "frontend" {
  name         = "${local.name_prefix}-build-frontend"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-frontend.yml"
  }

  cache {
    type = "LOCAL"
    modes = ["LOCAL_SOURCE_CACHE"]
  }

  environment {
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"
    compute_type = "BUILD_GENERAL1_SMALL"

    environment_variable {
      name  = "FRONTEND_BUCKET"
      value = aws_s3_bucket.frontend.bucket
    }
    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION_ID"
      value = aws_cloudfront_distribution.frontend.id
    }
    environment_variable {
      name  = "ALB_DNS_NAME"
      value = aws_lb.public.dns_name
    }
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.name_prefix}-frontend"
      stream_name = "build"
    }
  }

  tags = local.tags
}

# ================= 3. CodePipeline: define IAM roles and permissions =================
data "aws_iam_policy_document" "codepipeline_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codepipeline" {
  name               = "${local.name_prefix}-codepipeline-role"
  assume_role_policy = data.aws_iam_policy_document.codepipeline_assume.json
  tags               = local.tags
}

# Custom policy for CodePipeline permissions
data "aws_iam_policy_document" "codepipeline_policy" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject"
    ]
    resources = [
      "${aws_s3_bucket.codepipeline_artifacts.arn}/*",
      "${aws_s3_bucket.frontend.arn}/*"  #for frontend bucket access for deployment
    ]
  }

  statement {
    actions = [
      "codebuild:BatchGetBuilds",
      "codebuild:StartBuild"
    ]
    resources = concat(
      [for project in aws_codebuild_project.build : project.arn],
      [aws_codebuild_project.frontend.arn]  # ADD THIS LINE
    )
  }

  statement {
    actions = [
      "codestar-connections:UseConnection"
    ]
    resources = [
      aws_codestarconnections_connection.github.arn
    ]
  }

  statement {
    actions = [
      "ecs:*",
      "iam:PassRole"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "cloudfront:CreateInvalidation"
    ]
    resources = [
      aws_cloudfront_distribution.frontend.arn
    ]
  }
}

resource "aws_iam_policy" "codepipeline" {
  name   = "${local.name_prefix}-codepipeline-policy"
  policy = data.aws_iam_policy_document.codepipeline_policy.json
}

resource "aws_iam_role_policy_attachment" "codepipeline" {
  role       = aws_iam_role.codepipeline.name
  policy_arn = aws_iam_policy.codepipeline.arn
}

# =================== 4. CodePipeline: define the pipeline stages to push the image into ecr  =================

resource "aws_codepipeline" "this" {
  name     = "${local.name_prefix}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  # Stage 1: Source from GitHub
  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
      }
    }
  }

  # Stage 2: Build (Docker build & push to ECR)
  stage {
    name = "Build"
    dynamic "action" {
      for_each = var.services
      content {
        name             = "Build-${action.value}"
        category         = "Build"
        owner            = "AWS"
        provider         = "CodeBuild"
        version          = "1"
        input_artifacts  = ["source_output"]
        output_artifacts = ["build_output_${action.value}"]
        run_order = 1 # ensure parallel build
        configuration = {
          ProjectName = aws_codebuild_project.build[action.value].name
        }
      }
    }
  }

  # Stage 3: Build the frontend
  stage {
    name = "BuildFrontend"
    action {
      name             = "BuildAndDeployFrontend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["frontend_output"]
      run_order        = 2  # Run after backend builds
      configuration = {
        ProjectName = aws_codebuild_project.frontend.name
      }
    }
  }

  # Stage 4: Deploy to ECS (one action per service)
  stage {
    name = "Deploy"

    dynamic "action" {
      for_each = var.services
      content {
        name            = "Deploy-${action.value}"
        category        = "Deploy"
        owner           = "AWS"
        provider        = "ECS"
        version         = "1"
        input_artifacts = ["build_output_${action.value}"]
        run_order = 1 #ensure parellel deployment
        configuration = {
          ClusterName = aws_ecs_cluster.this.name
          ServiceName = aws_ecs_service.svc[action.value].name
          FileName    = "imagedefinitions-${action.value}.json"
        }
      }
    }
  }

  tags = local.tags
}

# ===== DATA SOURCES =====

data "aws_caller_identity" "current" {}

