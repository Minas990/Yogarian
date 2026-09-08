output "vpc_id" {
  value = module.network.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_locations_endpoint" {
  value = module.rds_locations.primary_endpoint
}

output "auth_table_name" {
  value = module.dynamodb.auth_table_name
}

output "users_table_name" {
  value = module.dynamodb.users_table_name
}

output "follows_table_name" {
  value = module.dynamodb.follows_table_name
}

output "nlb_dns_name" {
  value = module.nlb.dns_name
}

output "aurora_search_endpoint" {
  value = module.aurora_search.cluster_endpoint
}

output "redis_primary_endpoint" {
  value = module.elasticache.primary_endpoint
}

output "msk_bootstrap_brokers_iam" {
  value = module.msk.bootstrap_brokers_iam
}

output "notifications_ecr_repository_url" {
  value = module.notifications.ecr_repository_url
}

output "irsa_role_arns" {
  value = module.irsa.role_arns
}
