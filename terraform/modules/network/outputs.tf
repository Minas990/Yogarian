output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "app_private_subnet_ids" {
  value = aws_subnet.app_private[*].id
}

output "data_private_subnet_ids" {
  value = aws_subnet.data_private[*].id
}
