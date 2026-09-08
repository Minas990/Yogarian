resource "random_password" "master" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-search-aurora-subnet-group"
  subnet_ids = var.data_private_subnet_ids
  tags = {
    Name = "${var.project}-search-aurora-subnet-group"
  }
}

resource "aws_security_group" "aurora" {
  name        = "${var.project}-search-aurora-sg"
  description = "Aurora security group for search service"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
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
    Name = "${var.project}-search-aurora-sg"
  }
}

resource "aws_secretsmanager_secret" "aurora_credentials" {
  name = "${var.project}-search-aurora-credentials"
}

resource "aws_secretsmanager_secret_version" "aurora_credentials" {
  secret_id = aws_secretsmanager_secret.aurora_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.master.result
  })
}

resource "aws_rds_cluster" "this" {
  cluster_identifier      = "${var.project}-search-aurora"
  engine                  = "aurora-postgresql"
  engine_version           = var.engine_version
  database_name            = "search"
  master_username          = var.db_username
  master_password          = random_password.master.result
  db_subnet_group_name     = aws_db_subnet_group.this.name
  vpc_security_group_ids   = [aws_security_group.aurora.id]
  storage_encrypted        = true
  backup_retention_period  = 7
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.project}-search-aurora-final"
  deletion_protection      = true
}

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project}-search-aurora-writer"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}

resource "aws_rds_cluster_instance" "reader" {
  identifier         = "${var.project}-search-aurora-reader"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}