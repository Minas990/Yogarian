$repoRoot = Resolve-Path "$PSScriptRoot\.."

$services = @(
  "notifications-service",
  "auth-service",
  "users-service"
)

foreach ($service in $services) {
  Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$repoRoot'; npm run start:dev $service"
  )
}
