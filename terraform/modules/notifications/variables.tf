variable "project" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "v1"
}

variable "app_private_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  type = string
}

variable "msk_cluster_arn" {
  type = string
}

variable "notifications_table_arn" {
  type = string
}

variable "kafka_topic" {
  type = string
}
