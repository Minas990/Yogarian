output "primary_endpoint" {
  value = aws_db_instance.primary.endpoint
}

output "replica_endpoint" {
  value = aws_db_instance.replica.endpoint
}

output "security_group_id" {
  value = aws_security_group.db.id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}
