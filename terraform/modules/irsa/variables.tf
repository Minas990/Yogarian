variable "project" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_provider_url" {
  type = string
}

variable "msk_cluster_arn" {
  type = string
}

variable "services" {
  type = map(object({
    namespace          = string
    service_account    = string
    extra_policy_json  = string
  }))
}
