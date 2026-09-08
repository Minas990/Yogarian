resource "aws_dynamodb_table" "payment" {
  name         = "${var.project}-payment-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "sessionId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "payment_intent_id"
    type = "S"
  }

  global_secondary_index {
    name            = "payment-intent-id-index"
    hash_key        = "payment_intent_id"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "payment_stripe_checkout_lookup" {
  name         = "${var.project}-payment-stripe-checkout-lookup"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "stripe_checkout_session_id"

  attribute {
    name = "stripe_checkout_session_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "reservations" {
  name         = "${var.project}-reservations-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "sessionId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "requestId"
    type = "S"
  }

  global_secondary_index {
    name            = "request-id-index"
    hash_key        = "requestId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "session-index"
    hash_key        = "sessionId"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "sessions" {
  name         = "${var.project}-sessions-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "trainerId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "startTime"
    type = "S"
  }

  global_secondary_index {
    name            = "trainer-index"
    hash_key        = "trainerId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-starttime-index"
    hash_key        = "status"
    range_key       = "startTime"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "media" {
  name         = "${var.project}-media-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "ownerType"
    type = "S"
  }

  attribute {
    name = "OwnerId"
    type = "S"
  }

  global_secondary_index {
    name            = "owner-index"
    hash_key        = "ownerType"
    range_key       = "OwnerId"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "auth" {
  name         = "${var.project}-auth-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "passwordResetToken"
    type = "S"
  }

  attribute {
    name = "passwordResetTokenExpiresAt"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "reset-token-valid-index"
    hash_key        = "passwordResetToken"
    range_key       = "passwordResetTokenExpiresAt"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.project}-users-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "follows" {
  name         = "${var.project}-follows-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "followerId"
  range_key    = "followingId"

  attribute {
    name = "followerId"
    type = "S"
  }

  attribute {
    name = "followingId"
    type = "S"
  }

  global_secondary_index {
    name            = "following-follower-index"
    hash_key        = "followingId"
    range_key       = "followerId"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "notifications" {
  name         = "${var.project}-notifications-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "idempotencyKey"

  attribute {
    name = "idempotencyKey"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
