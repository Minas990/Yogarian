resource "aws_security_group" "msk" {
  name        = "${var.project}-msk-sg"
  description = "MSK broker security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 9098
    to_port          = 9098
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  ingress {
    from_port       = 2181
    to_port         = 2181
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
    Name = "${var.project}-msk-sg"
  }
}

resource "aws_kms_key" "msk" {
  description = "${var.project} MSK encryption key"
}

resource "aws_msk_cluster" "this" {
  cluster_name           = "${var.project}-msk"
  kafka_version           = var.kafka_version
  number_of_broker_nodes  = 3

  broker_node_group_info {
    instance_type   = var.instance_type
    client_subnets  = var.data_private_subnet_ids
    security_groups = [aws_security_group.msk.id]
    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      iam = true
    }
  }
}
