resource "aws_iam_role" "service" {
  for_each = var.services
  name     = "${var.project}-${each.key}-irsa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${var.oidc_provider_url}:sub" = "system:serviceaccount:${each.value.namespace}:${each.value.service_account}"
          "${var.oidc_provider_url}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "kafka" {
  for_each = var.services
  name     = "${var.project}-${each.key}-kafka-policy"
  role     = aws_iam_role.service[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "kafka-cluster:Connect",
        "kafka-cluster:DescribeCluster",
        "kafka-cluster:DescribeTopic",
        "kafka-cluster:ReadData",
        "kafka-cluster:WriteData",
        "kafka-cluster:DescribeGroup",
        "kafka-cluster:AlterGroup",
        "kafka-cluster:CreateTopic"
      ]
      Resource = [
        var.msk_cluster_arn,
        "${replace(var.msk_cluster_arn, ":cluster/", ":topic/")}/*",
        "${replace(var.msk_cluster_arn, ":cluster/", ":group/")}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "extra" {
  for_each = { for k, v in var.services : k => v if v.extra_policy_json != "" }
  name     = "${var.project}-${each.key}-extra-policy"
  role     = aws_iam_role.service[each.key].id
  policy   = each.value.extra_policy_json
}
