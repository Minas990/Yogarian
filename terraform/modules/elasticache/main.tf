resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.project}-redis-subnet-group"
  subnet_ids = var.data_private_subnet_ids
}

resource "aws_security_group" "redis" {
  name        = "${var.project}-redis-sg"
  description = "Redis security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project}-redis-sg"
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${var.project}-redis"
  description                = "${var.project} redis cluster"
  node_type                  = var.node_type
  num_cache_clusters         = 3
  engine                     = "redis"
  automatic_failover_enabled = true
  multi_az_enabled           = true
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
