output "ecr_repository_url" {
  value = aws_ecr_repository.notifications.repository_url
}

output "lambda_function_arn" {
  value = aws_lambda_function.notifications.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}
