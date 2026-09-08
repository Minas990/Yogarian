output "cluster_endpoint" {
  value = aws_rds_cluster.this.endpoint
}

output "reader_endpoint" {
  value = aws_rds_cluster.this.reader_endpoint
}

output "security_group_id" {
  value = aws_security_group.aurora.id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.aurora_credentials.arn
}
