# ALB SG – internet to 80/443

# ------------------- security group for alb (public) -------------------
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB security group"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

# port 80 (always) for unencrypted traffic (public subnets)
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}


resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# no restricitons on what goes out (is returned to client)
resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# service-to-service communication
resource "aws_vpc_security_group_ingress_rule" "ecs_from_ecs" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.ecs.id
  ip_protocol                  = "tcp"
  from_port                    = 0
  to_port                      = 65535
  description                  = "Allow ECS tasks to communicate with each other"
}


# ------------------- ECS tasks - private subnet -------------------
resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs-sg"
  description = "ECS tasks security group"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb_all_tcp" {
  security_group_id             = aws_security_group.ecs.id
  referenced_security_group_id  = aws_security_group.alb.id
  ip_protocol                   = "tcp"
  from_port                     = 0
  to_port                       = 65535
}

#outbound: all
resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}


# DB SG – only from ECS SG on 5432/3306 etc (created in rds.tf when enabled)


# ------------------- endpoints -------------------
resource "aws_security_group" "endpoints" {
  count       = var.enable_endpoints ? 1 : 0
  name        = "${local.name_prefix}-endpoints-sg"
  description = "SG for Interface Endpoints"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

resource "aws_vpc_security_group_egress_rule" "endpoints_all" {
  count            = var.enable_endpoints ? 1 : 0
  security_group_id= aws_security_group.endpoints[0].id
  ip_protocol      = "-1"
  cidr_ipv4        = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "endpoints_from_vpc" {
  count             = var.enable_endpoints ? 1 : 0
  security_group_id = aws_security_group.endpoints[0].id
  cidr_ipv4         = var.vpc_cidr
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Allow HTTPS from VPC to reach VPC endpoints"
}

resource "aws_vpc_security_group_egress_rule" "ecs_to_endpoints" {
  count                        = var.enable_endpoints ? 1 : 0
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.endpoints[0].id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  description                  = "Allow ECS to reach VPC endpoints"
}

# ---------------------- GuardDuty (monitors services laterally; detects and alerts for attacks ----------------------------
resource "aws_guardduty_detector" "main" {
  count  = var.enable_guardduty ? 1 : 0
  enable = true
  
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false  # Not using EKS
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
  
  tags = local.tags
}


# GuardDuty SNS topic for alerts
resource "aws_sns_topic" "guardduty_alerts" {
  count = var.enable_guardduty ? 1 : 0
  name  = "${local.name_prefix}-guardduty-alerts"
  tags  = local.tags
}

resource "aws_sns_topic_subscription" "guardduty_email" {
  count     = var.enable_guardduty ? 1 : 0
  topic_arn = aws_sns_topic.guardduty_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}


# GuardDuty findings to SNS (Eventbridge)
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  count       = var.enable_guardduty ? 1 : 0
  name        = "${local.name_prefix}-guardduty-findings"
  description = "Capture GuardDuty findings"
  
  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [4, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6, 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]  # Medium to High severity
    }
  })
  
  tags = local.tags
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  count     = var.enable_guardduty ? 1 : 0
  rule      = aws_cloudwatch_event_rule.guardduty_findings[0].name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.guardduty_alerts[0].arn
}

# SNS topic policy
resource "aws_sns_topic_policy" "guardduty_alerts" {
  count  = var.enable_guardduty ? 1 : 0
  arn    = aws_sns_topic.guardduty_alerts[0].arn
  policy = data.aws_iam_policy_document.guardduty_sns_policy[0].json
}

data "aws_iam_policy_document" "guardduty_sns_policy" {
  count = var.enable_guardduty ? 1 : 0
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.guardduty_alerts[0].arn]
  }
}

# ========== WAF for ALB =================
resource "aws_wafv2_web_acl" "alb" {
  count       = var.enable_waf ? 1 : 0
  name        = "${local.name_prefix}-alb-waf"
  description = "WAF for ALB protection"
  scope       = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  # AWS Managed Rule: Core Rule Set (CRS)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rule: Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rule: SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # Rate limiting rule (prevent DDoS)
  rule {
    name     = "RateLimitRule"
    priority = 4
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000  # requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-alb-waf"
    sampled_requests_enabled   = true
  }
  
  tags = local.tags
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.enable_waf ? 1 : 0
  resource_arn = aws_lb.public.arn
  web_acl_arn  = aws_wafv2_web_acl.alb[0].arn
}


# ==================== CloudWatch Alarms for Security ====================

# Alarm for GuardDuty findings
resource "aws_cloudwatch_metric_alarm" "guardduty_findings" {
  count               = var.enable_guardduty ? 1 : 0
  alarm_name          = "${local.name_prefix}-guardduty-high-severity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "GuardDutyHighSeverityFindings"
  namespace           = "AWS/GuardDuty"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert on GuardDuty high severity findings"
  alarm_actions       = [aws_sns_topic.guardduty_alerts[0].arn]
  
  tags = local.tags
}

# Alarm for WAF blocked requests
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  count               = var.enable_waf ? 1 : 0
  alarm_name          = "${local.name_prefix}-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Alert when WAF blocks many requests"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    Rule   = "ALL"
    WebACL = aws_wafv2_web_acl.alb[0].name
    Region = var.aws_region
  }
  
  tags = local.tags
}


# ==================== S3 for CloudTrail ====================
resource "aws_s3_bucket" "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = "${local.name_prefix}-cloudtrail-logs"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail[0].id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail[0].id
  
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter {}
    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail[0].id
  policy = data.aws_iam_policy_document.cloudtrail_s3[0].json
}

data "aws_iam_policy_document" "cloudtrail_s3" {
  count = var.enable_cloudtrail ? 1 : 0
  
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail[0].arn]
  }
  
  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail[0].arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}


# ==================== CloudTrail ====================
resource "aws_cloudtrail" "main" {
  count                         = var.enable_cloudtrail ? 1 : 0
  name                          = "${local.name_prefix}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail[0].id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  
  depends_on = [aws_s3_bucket_policy.cloudtrail]
  tags       = local.tags
}


# ==================== VPC Flow Logs for Network Monitoring ====================
resource "aws_flow_log" "vpc" {
  iam_role_arn    = aws_iam_role.vpc_flow_log.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = module.vpc.vpc_id
  
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/${local.name_prefix}-flow-logs"
  retention_in_days = 7
  tags              = local.tags
}

resource "aws_iam_role" "vpc_flow_log" {
  name = "${local.name_prefix}-vpc-flow-log-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.tags
}

resource "aws_iam_role_policy" "vpc_flow_log" {
  name = "${local.name_prefix}-vpc-flow-log-policy"
  role = aws_iam_role.vpc_flow_log.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}