resource "aws_lb" "public" {
  name               = "${local.name_prefix}-alb"
  load_balancer_type = "application"
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]
  idle_timeout       = 60
  tags               = local.tags
}

# health check target group - for ALL SERVICES to perform health check 
resource "aws_lb_target_group" "svc" {
  for_each = local.public_services

  name        = "${local.name_prefix}-${each.key}-tg"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip" # Fargate

  health_check {
    path                = lookup(each.value, "health", "/")
    matcher             = "200-399"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}


resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  # If no cert, return 404 by default (path rules will catch real routes if you stick with HTTP)
  dynamic "default_action" {
    for_each = var.acm_certificate_arn == "" ? [1] : []
    content {
      type = "fixed-response"
      fixed_response {
        content_type = "text/plain"
        status_code  = "404"
        message_body = "Not Found"
      }
    }
  }

  # If cert exists, redirect all HTTP to HTTPS
  dynamic "default_action" {
    for_each = var.acm_certificate_arn == "" ? [] : [1]
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}


# HTTPS listener (optional)
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default: 404 (path rules added below will forward to service TGs)
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "404"
      message_body = "Not Found"
    }
  }
}


# HTTP path rules (for PUBLIC SERVICES - connects directly to frontend through ALB)
resource "aws_lb_listener_rule" "http_paths" {
  for_each     = local.public_services
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 + index(keys(local.services), each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.svc[each.key].arn
  }

  condition {
    path_pattern { values = [each.value.path] }  # e.g. "/country/*"
  }

  tags = local.tags
}

# HTTPS path rules (only created when ACM is present)
resource "aws_lb_listener_rule" "https_paths" {
  for_each = var.acm_certificate_arn == "" ? {} : local.public_services

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200 + index(keys(local.services), each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.svc[each.key].arn
  }

  condition {
    path_pattern { values = [each.value.path] }
  }

  tags = local.tags
}
