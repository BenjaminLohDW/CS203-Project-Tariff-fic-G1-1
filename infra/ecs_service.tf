#---------------------------- task_definition for EACH service ---------------------------------


#===================== SERVICE DISCOVERY (CLOUD MAP) =====================
# private DNS namespace for Cloud Map
resource "aws_service_discovery_private_dns_namespace" "ns" {
  count       = var.enable_cloud_map ? 1 : 0
  name        = "svc.local"
  description = "Service discovery namespace"
  vpc         = module.vpc.vpc_id
  tags        = local.tags
}


#one cloud mapdiscovery per service
resource "aws_service_discovery_service" "svc" {
  for_each = var.enable_cloud_map ? local.services : {}

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


# ================= ECS TASK DEFINITION (FARGATE) =================
#task definition - fargate configuration
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
      name         = each.key
      image        = "${aws_ecr_repository.app.repository_url}:${each.key}-${var.container_image_tag}"
      essential    = true
      portMappings = [{
        containerPort = each.value.port
        protocol      = "tcp"
      }]

      #----- DB configs ------
      environment = [
        { name = "SPRING_PROFILES_ACTIVE", value = each.key =="tariff" ? "aws" : "local" }, # set local/prod env for java services
        { name = "ENV",         value = "aws" }, # set local/prod env for python services
        { name = "DB_HOST",     value = var.enable_rds_proxy ? aws_db_proxy.this[0].endpoint : aws_db_instance.writer.address },
        { name = "DB_PORT",     value = tostring(var.db_port) },
        { name = "DB_NAME",     value = var.db_name },
        { name = "DB_USER",     value = var.db_username },
        { name = "DB_PASSWORD", value = var.db_password },
        { name = "DB_SSLMODE",  value = var.db_sslmode },
        { name = "DB_SECRET_ARN", value = var.enable_rds_proxy ? aws_secretsmanager_secret.db.arn : "" }, 
        { name = "DB_PROXY_ENDPOINT", value = var.enable_rds_proxy ? aws_db_proxy.this[0].endpoint : "" }, 
        { name = "REDIS_HOST",  value = var.enable_redis ? aws_elasticache_replication_group.this[0].primary_endpoint_address : "" },
        { name = "REDIS_PORT",  value = "6379"}, 
        { name = "AWS_REGION",  value = var.aws_region }, # for SDK calls
        { name = "AUTO_CREATE_DB", value = "1" }, # ensures that the tables are created in the rds when the project is initialised
        
        # internal service discovery endpoint
        { name = "PRODUCT_MS_BASE",  value = var.enable_cloud_map ? "http://product.svc.local:5002" : "http://localhost:5002" },
        { name = "TARIFF_MS_BASE",  value = var.enable_cloud_map ? "http://tariff.svc.local:5006" : "http://localhost:5004" },
        { name = "COUNTRY_MS_BASE",  value = var.enable_cloud_map ? "http://country.svc.local:5005" : "http://localhost:5005" },
        { name = "AGREEMENT_MS_BASE",  value = var.enable_cloud_map ? "http://agreement.svc.local:5006" : "http://localhost:5006"}
      ]

      secrets = [
        {
          name      = "FIREBASE_CREDENTIALS_JSON"
          valueFrom = aws_secretsmanager_secret.firebase_credentials.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
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

# ================= ECS SERVICES (ACTUAL SERVICE DEFINITION) =================
resource "aws_ecs_service" "svc" {
  for_each        = local.services
  name            = "${local.name_prefix}-${each.key}"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.svc[each.key].arn
  desired_count   = lookup(local.desired_counts, each.key, var.desired_count)
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = contains(keys(local.public_services), each.key) ? 120 : null  # Give services 2 minutes to start

  network_configuration {
    subnets = module.vpc.private_subnets # services all in private subnet
    security_groups = [aws_security_group.ecs.id] 
    assign_public_ip = false #no public IPs
  }

  # NOTE: only PUBLIC services will be attached to load balancer
  dynamic "load_balancer" {
    for_each = contains(keys(local.public_services), each.key) ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.svc[each.key].arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  # service discovery for ALL services - (for service to service internal communication)
  dynamic "service_registries" {
    for_each = var.enable_cloud_map ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.svc[each.key].arn
    }
  }

  deployment_minimum_healthy_percent = 100 # changed from 50 - ensure old tasks stay running until new ones are healthy
  deployment_maximum_percent         = 200 #

  # automatic roll back if fails
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener_rule.http_paths,
    aws_db_instance.writer,
  ]

  tags = local.tags
}