module "network" {
  source   = "./modules/network"
  project  = var.project
  vpc_cidr = var.vpc_cidr
  azs      = var.azs
}

module "eks" {
  source                  = "./modules/eks"
  project                 = var.project
  cluster_version         = var.eks_cluster_version
  vpc_id                  = module.network.vpc_id
  app_private_subnet_ids  = module.network.app_private_subnet_ids
  node_instance_types     = var.eks_node_instance_types
}

module "rds_locations" {
  source                   = "./modules/rds"
  project                  = var.project
  service_name             = "locations"
  instance_class           = var.rds_instance_class
  vpc_id                   = module.network.vpc_id
  data_private_subnet_ids  = module.network.data_private_subnet_ids
  app_security_group_id    = module.eks.cluster_security_group_id
}

module "aurora_search" {
  source                   = "./modules/aurora"
  project                  = var.project
  instance_class           = var.aurora_instance_class
  vpc_id                   = module.network.vpc_id
  data_private_subnet_ids  = module.network.data_private_subnet_ids
  app_security_group_id    = module.eks.cluster_security_group_id
}

module "dynamodb" {
  source  = "./modules/dynamodb"
  project = var.project
}

module "elasticache" {
  source                   = "./modules/elasticache"
  project                  = var.project
  node_type                = var.redis_node_type
  vpc_id                   = module.network.vpc_id
  data_private_subnet_ids  = module.network.data_private_subnet_ids
  app_security_group_id    = module.eks.cluster_security_group_id
}

module "msk" {
  source                   = "./modules/msk"
  project                  = var.project
  instance_type             = var.msk_instance_type
  vpc_id                    = module.network.vpc_id
  data_private_subnet_ids   = module.network.data_private_subnet_ids
  app_security_group_id     = module.eks.cluster_security_group_id
}

resource "aws_s3_bucket" "media" {
  bucket = "${var.project}-media"
}

module "irsa" {
  source             = "./modules/irsa"
  project            = var.project
  oidc_provider_arn  = module.eks.oidc_provider_arn
  oidc_provider_url  = module.eks.oidc_provider_url
  msk_cluster_arn    = module.msk.cluster_arn

  services = {
    auth-service = {
      namespace       = "default"
      service_account = "auth-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect = "Allow"
          Action = [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:DeleteItem"
          ]
          Resource = [
            module.dynamodb.auth_table_arn,
            "${module.dynamodb.auth_table_arn}/index/*"
          ]
        }]
      })
    }
    user-service = {
      namespace       = "default"
      service_account = "user-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect = "Allow"
          Action = [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:DeleteItem"
          ]
          Resource = [
            module.dynamodb.users_table_arn,
            module.dynamodb.follows_table_arn,
            "${module.dynamodb.follows_table_arn}/index/*"
          ]
        }]
      })
    }
    search-service = {
      namespace       = "default"
      service_account = "search-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect   = "Allow"
          Action   = "secretsmanager:GetSecretValue"
          Resource = module.aurora_search.secret_arn
        }]
      })
    }
    locations-service = {
      namespace       = "default"
      service_account = "locations-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect   = "Allow"
          Action   = "secretsmanager:GetSecretValue"
          Resource = module.rds_locations.secret_arn
        }]
      })
    }
    payment-service = {
      namespace       = "default"
      service_account = "payment-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect = "Allow"
          Action = [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:DeleteItem",
            "dynamodb:TransactWriteItems"
          ]
          Resource = [
            module.dynamodb.payment_table_arn,
            "${module.dynamodb.payment_table_arn}/index/*",
            module.dynamodb.payment_stripe_checkout_lookup_arn
          ]
        }]
      })
    }
    reservations-service = {
      namespace       = "default"
      service_account = "reservations-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect = "Allow"
          Action = [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:DeleteItem"
          ]
          Resource = [
            module.dynamodb.reservations_table_arn,
            "${module.dynamodb.reservations_table_arn}/index/*"
          ]
        }]
      })
    }
    sessions-service = {
      namespace       = "default"
      service_account = "sessions-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect = "Allow"
          Action = [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:DeleteItem"
          ]
          Resource = [
            module.dynamodb.sessions_table_arn,
            "${module.dynamodb.sessions_table_arn}/index/*"
          ]
        }]
      })
    }
    media-service = {
      namespace       = "default"
      service_account = "media-service"
      extra_policy_json = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query",
              "dynamodb:DeleteItem"
            ]
            Resource = [
              module.dynamodb.media_table_arn,
              "${module.dynamodb.media_table_arn}/index/*"
            ]
          },
          {
            Effect   = "Allow"
            Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
            Resource = "${aws_s3_bucket.media.arn}/*"
          }
        ]
      })
    }
  }
}

module "notifications" {
  source                    = "./modules/notifications"
  project                   = var.project
  app_private_subnet_ids    = module.network.app_private_subnet_ids
  app_security_group_id     = module.eks.cluster_security_group_id
  msk_cluster_arn           = module.msk.cluster_arn
  notifications_table_arn   = module.dynamodb.notifications_table_arn
  kafka_topic               = "notification-events"
}

locals {
  pod_services = [
    "auth-service", "user-service", "reservations-service", "media-service",
    "search-service", "locations-service", "payment-service", "sessions-service"
  ]

  pod_service_ports = {
    auth-service          = 3000
    user-service          = 3001
    reservations-service  = 3002
    media-service         = 3003
    search-service        = 3004
    locations-service     = 3005
    payment-service       = 3006
    sessions-service      = 3007
  }
}

resource "aws_ecr_repository" "service" {
  for_each             = toset(local.pod_services)
  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

module "nlb" {
  source                  = "./modules/nlb"
  project                 = var.project
  vpc_id                  = module.network.vpc_id
  app_private_subnet_ids  = module.network.app_private_subnet_ids

  services = {
    for name, port in local.pod_service_ports : name => { port = port }
  }
}
