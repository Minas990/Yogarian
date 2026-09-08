variable "project" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "data_private_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  type = string
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "engine_version" {
  type    = string
  default = "16.4"
}
