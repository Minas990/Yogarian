resource "aws_security_group" "nlb" {
  name        = "${var.project}-nlb-sg"
  description = "NLB security group"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.services
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/16"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-nlb-sg"
  }
}

resource "aws_lb" "this" {
  name               = "${var.project}-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.app_private_subnet_ids
  security_groups    = [aws_security_group.nlb.id]

  tags = {
    Name = "${var.project}-nlb"
  }
}

resource "aws_lb_target_group" "this" {
  for_each    = var.services
  name        = "${var.project}-${each.key}-tg"
  port        = each.value.port
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = {
    Name = "${var.project}-${each.key}-tg"
  }
}

resource "aws_lb_listener" "this" {
  for_each          = var.services
  load_balancer_arn = aws_lb.this.arn
  port              = each.value.port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this[each.key].arn
  }
}
