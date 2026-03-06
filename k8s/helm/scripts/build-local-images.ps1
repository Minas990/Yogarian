param(
  [string[]]$Services = @(
    "api-gateway",
    "auth-service",
    "users-service",
    "media-service",
    "location-service",
    "sessions-service",
    "notifications-service",
    "reservations-service",
    "payments-service",
    "search-service"
  ),
  [string]$Tag = "local"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

foreach ($service in $Services) {
  $dockerfile = "apps/$service/Dockerfile"
  if (-not (Test-Path -LiteralPath $dockerfile)) {
    Write-Warning "Skipping '$service' because Dockerfile was not found at $dockerfile"
    continue
  }

  $image = "yoga/$service:$Tag"
  Write-Host "Building $image from $dockerfile"
  docker build -f $dockerfile -t $image .
}

Write-Host "Done building local images."
