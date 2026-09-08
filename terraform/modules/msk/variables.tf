variable "project" {
  type = string
}

variable "instance_type" {
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

variable "kafka_version" {
  type    = string
  default = "3.6.0"
}
