# Optional private DNS namespace for Cloud Map
resource "aws_service_discovery_private_dns_namespace" "ns" {
  count       = var.enable_cloud_map ? 1 : 0
  name        = "svc.local"
  description = "Service discovery namespace"
  vpc         = module.vpc.vpc_id
  tags        = local.tags
}

#one cloud mapdiscovery per service
resource "aws_service_discovery_service" "svc" {
  for_each = var.enable_cloud_map ? locals.services : {}

  name  = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.ns[0].id
    dns_records {
      type = "A"
      ttl  = 10
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config { failure_threshold = 1 }
  tags = local.tags
}

resource "aws_ecs_task_definition" "svc" {
  for_each                 = local.services
  family                   = "${local.name_prefix}-${each.key}"
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name         = each.key,
      image        = "${aws_ecr_repository.app.repository_url}:${each.key}-${var.container_image_tag}",
      essential    = true,
      portMappings = [{
        containerPort = each.value.port
        protocol      = "tcp"
      }],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          awslogs-group         = aws_cloudwatch_log_group.svc[each.key].name,
          awslogs-region        = var.aws_region,
          awslogs-stream-prefix = each.key
        }
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64" # change to ARM64 if your image is arm
  }

  tags = local.tags
}

resource "aws_ecs_service" "svc" {
  for_each        = local.services
  name            = "${local.name_prefix}-${each.key}"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.svc[each.key].arn
  desired_count   = lookup(local.desired_counts, each.key, var.desired_count)
  launch_type     = "FARGATE"

  network_configuration {
    subnets = module.vpc.private_subnets # <— match how you pass these elsewhere
    security_groups = [aws_security_group.ecs.id]  # <— align with your SG name
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.svc[each.key].arn
    container_name   = each.key
    container_port   = each.value.port
  }

  dynamic "service_registries" {
    for_each = var.enable_cloud_map ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.svc[each.key].arn
    }
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = concat(
    [aws_lb_listener.http],
    var.acm_certificate_arn == "" ? [] : [aws_lb_listener.https]
  )
  tags       = local.tags
}