variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "app_private_subnet_ids" {
  type = list(string)
}

variable "services" {
  type = map(object({
    port = number
  }))
}
