resource "aws_ecr_repository" "notifications" {
  name                 = "${var.project}-notifications"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project}-notifications-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "kafka_consume" {
  name = "${var.project}-notifications-kafka-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "kafka-cluster:Connect",
        "kafka-cluster:DescribeCluster",
        "kafka-cluster:DescribeTopic",
        "kafka-cluster:ReadData",
        "kafka-cluster:DescribeGroup",
        "kafka-cluster:AlterGroup"
      ]
      Resource = [
        var.msk_cluster_arn,
        "${replace(var.msk_cluster_arn, ":cluster/", ":topic/")}/*",
        "${replace(var.msk_cluster_arn, ":cluster/", ":group/")}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.project}-notifications-dynamodb-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:ConditionCheckItem"
      ]
      Resource = var.notifications_table_arn
    }]
  })
}

resource "aws_lambda_function" "notifications" {
  function_name = "${var.project}-notifications-service"
  role          = aws_iam_role.lambda_execution.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.notifications.repository_url}:${var.image_tag}"
  timeout       = 30
  memory_size   = 512

  vpc_config {
    subnet_ids         = var.app_private_subnet_ids
    security_group_ids = [var.app_security_group_id]
  }
}

resource "aws_lambda_event_source_mapping" "kafka" {
  event_source_arn = var.msk_cluster_arn
  function_name     = aws_lambda_function.notifications.arn
  topics            = [var.kafka_topic]
  starting_position = "LATEST"
  batch_size        = 100

  source_access_configuration {
    type = "VPC_SUBNET"
    uri  = "subnet:${var.app_private_subnet_ids[0]}"
  }

  source_access_configuration {
    type = "VPC_SECURITY_GROUP"
    uri  = "security_group:${var.app_security_group_id}"
  }
}
