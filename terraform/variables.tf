variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "yogarian"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "rds_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "aurora_instance_class" {
  type    = string
  default = "db.r6g.large"
}

variable "msk_instance_type" {
  type    = string
  default = "kafka.m5.large"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t3.medium"
}

variable "eks_cluster_version" {
  type    = string
  default = "1.31"
}

variable "eks_node_instance_types" {
  type    = list(string)
  default = ["t3.large"]
}
