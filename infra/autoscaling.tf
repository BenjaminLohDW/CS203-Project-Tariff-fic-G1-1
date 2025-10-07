# Target: scale each ECS service's desired_count (Fargate)
resource "aws_appautoscaling_target" "svc" {
  for_each = local.services

  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  # service/<cluster-name>/<service-name>
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.svc[each.key].name}"

  # Use global min/max or override with locals if you want per-service caps
  min_capacity = var.min_count
  max_capacity = var.max_count
}

# CPU target tracking for each service
resource "aws_appautoscaling_policy" "svc_cpu" {
  for_each = local.services

  name               = "${local.name_prefix}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.svc[each.key].service_namespace
  scalable_dimension = aws_appautoscaling_target.svc[each.key].scalable_dimension
  resource_id        = aws_appautoscaling_target.svc[each.key].resource_id

  target_tracking_scaling_policy_configuration {
    target_value = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# (Optional) Memory target tracking as a second signal
resource "aws_appautoscaling_policy" "svc_mem" {
  for_each = local.services

  name               = "${local.name_prefix}-${each.key}-mem"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.svc[each.key].service_namespace
  scalable_dimension = aws_appautoscaling_target.svc[each.key].scalable_dimension
  resource_id        = aws_appautoscaling_target.svc[each.key].resource_id

  target_tracking_scaling_policy_configuration {
    target_value = 70
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
