param(
  [string]$ReleaseName = "yoga",
  [string]$GlobalEnvPath = ".env",
  [string]$ServicesRoot = "apps",
  [string]$OutputDir = ".secrets-preview",
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
  )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-MergedEnv {
  param(
    [Parameter(Mandatory = $true)][string]$GlobalPath,
    [Parameter(Mandatory = $true)][string]$ServicePath
  )

  $result = [ordered]@{}

  foreach ($path in @($GlobalPath, $ServicePath)) {
    if (-not (Test-Path -LiteralPath $path)) {
      Write-Warning "Env file not found: $path"
      continue
    }

    Get-Content -LiteralPath $path | ForEach-Object {
      $line = $_.Trim()
      if ([string]::IsNullOrWhiteSpace($line)) { return }
      if ($line.StartsWith("#")) { return }

      $idx = $line.IndexOf("=")
      if ($idx -lt 1) { return }

      $key = $line.Substring(0, $idx).Trim()
      $value = $line.Substring($idx + 1)
      $result[$key] = $value
    }
  }

  return $result
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host ""
Write-Host "Output directory: $OutputDir"
Write-Host "-----------------------------------------"

foreach ($service in $Services) {
  $serviceEnvPath = Join-Path -Path (Join-Path -Path $ServicesRoot -ChildPath $service) -ChildPath ".env"
  $merged = Get-MergedEnv -GlobalPath $GlobalEnvPath -ServicePath $serviceEnvPath

  if ($merged.Count -eq 0) {
    Write-Warning "Skipping '$service' - no env values found"
    continue
  }

  $secretName = "$ReleaseName-$service-env"
  $outputFile = Join-Path -Path $OutputDir -ChildPath "$secretName.env"

  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($entry in $merged.GetEnumerator()) {
    $lines.Add("$($entry.Key)=$($entry.Value)")
  }

  Set-Content -LiteralPath $outputFile -Value $lines

  Write-Host "OK $secretName ($($merged.Count) keys) -> $outputFile"
}

Write-Host "-----------------------------------------"
Write-Host "Done. No kubectl was run."
Write-Host ""
Write-Host "NOTE: $OutputDir contains real secrets - do not commit to git."