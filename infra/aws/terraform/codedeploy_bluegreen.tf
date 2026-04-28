
# Optional: CodeDeploy blue/green deployments for ECS
# NOTE: This is an advanced setup. It requires ECS service 'deployment_controller' = CODE_DEPLOY.
# In V380 we provide the runnable baseline resources and documentation; you can enable it by setting enable_blue_green=true
# and updating the ECS service deployment_controller in main.tf accordingly.

resource "aws_codedeploy_app" "ecs" {
  count            = var.enable_blue_green ? 1 : 0
  name             = "${local.name}-codedeploy"
  compute_platform = "ECS"
}

resource "aws_iam_role" "codedeploy" {
  count = var.enable_blue_green ? 1 : 0
  name  = "${local.name}-codedeploy-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy_attach" {
  count      = var.enable_blue_green ? 1 : 0
  role       = aws_iam_role.codedeploy[0].name
  policy_arn  = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForECS"
}

resource "aws_codedeploy_deployment_group" "ecs" {
  count                  = var.enable_blue_green ? 1 : 0
  app_name               = aws_codedeploy_app.ecs[0].name
  deployment_group_name  = "${local.name}-dg"
  service_role_arn       = aws_iam_role.codedeploy[0].arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  ecs_service {
    cluster_name = aws_ecs_cluster.this.name
    service_name = aws_ecs_service.api.name
  }

  load_balancer_info {
    target_group_pair_info {
      target_group {
        name = aws_lb_target_group.api.name
      }
      # To fully enable blue/green, create a second target group and add it here.
      # target_group { name = aws_lb_target_group.api_green.name }
      prod_traffic_route {
        listener_arns = [aws_lb_listener.https[0].arn]
      }
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
