resource "random_password" "master" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.service_name}-db-subnet-group"
  subnet_ids = var.data_private_subnet_ids
  tags = {
    Name = "${var.project}-${var.service_name}-db-subnet-group"
  }
}

resource "aws_security_group" "db" {
  name        = "${var.project}-${var.service_name}-rds-sg"
  description = "RDS security group for ${var.service_name} service"
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
    Name = "${var.project}-${var.service_name}-rds-sg"
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project}-${var.service_name}-rds-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.master.result
  })
}

resource "aws_db_instance" "primary" {
  identifier             = "${var.project}-${var.service_name}-db"
  engine                 = "postgres"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  storage_type           = "gp3"
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  username               = var.db_username
  password               = random_password.master.result
  multi_az               = true
  storage_encrypted      = true
  backup_retention_period = 7
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project}-${var.service_name}-db-final"
  deletion_protection    = true

  tags = {
    Name = "${var.project}-${var.service_name}-db"
  }
}

resource "aws_db_instance" "replica" {
  identifier             = "${var.project}-${var.service_name}-db-replica"
  replicate_source_db    = aws_db_instance.primary.identifier
  instance_class         = var.instance_class
  vpc_security_group_ids = [aws_security_group.db.id]
  storage_encrypted      = true
  skip_final_snapshot    = true

  tags = {
    Name = "${var.project}-${var.service_name}-db-replica"
  }
}
