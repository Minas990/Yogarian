variable "project" {
  type = string
}

variable "cluster_version" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "app_private_subnet_ids" {
  type = list(string)
}

variable "node_instance_types" {
  type = list(string)
}
