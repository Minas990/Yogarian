output "auth_table_arn" {
  value = aws_dynamodb_table.auth.arn
}

output "auth_table_name" {
  value = aws_dynamodb_table.auth.name
}

output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "follows_table_arn" {
  value = aws_dynamodb_table.follows.arn
}

output "follows_table_name" {
  value = aws_dynamodb_table.follows.name
}

output "payment_table_arn" {
  value = aws_dynamodb_table.payment.arn
}

output "payment_table_name" {
  value = aws_dynamodb_table.payment.name
}

output "payment_stripe_checkout_lookup_arn" {
  value = aws_dynamodb_table.payment_stripe_checkout_lookup.arn
}

output "payment_stripe_checkout_lookup_name" {
  value = aws_dynamodb_table.payment_stripe_checkout_lookup.name
}

output "reservations_table_arn" {
  value = aws_dynamodb_table.reservations.arn
}

output "reservations_table_name" {
  value = aws_dynamodb_table.reservations.name
}

output "sessions_table_arn" {
  value = aws_dynamodb_table.sessions.arn
}

output "sessions_table_name" {
  value = aws_dynamodb_table.sessions.name
}

output "media_table_arn" {
  value = aws_dynamodb_table.media.arn
}

output "media_table_name" {
  value = aws_dynamodb_table.media.name
}

output "notifications_table_arn" {
  value = aws_dynamodb_table.notifications.arn
}

output "notifications_table_name" {
  value = aws_dynamodb_table.notifications.name
}
