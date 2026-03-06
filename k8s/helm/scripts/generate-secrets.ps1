param(
  [string]$Namespace = "yoga",
  [string]$ReleaseName = "yoga",
  [string]$GlobalEnvPath = ".env",
  [string]$ServicesRoot = "apps",
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

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f - | Out-Null
Write-Host "Namespace ensured: $Namespace"

foreach ($service in $Services) {
  $serviceEnvPath = Join-Path -Path (Join-Path -Path $ServicesRoot -ChildPath $service) -ChildPath ".env"
  $merged = Get-MergedEnv -GlobalPath $GlobalEnvPath -ServicePath $serviceEnvPath

  if ($merged.Count -eq 0) {
    Write-Warning "Skipping '$service' because no env values were found."
    continue
  }

  $tmpFile = [System.IO.Path]::GetTempFileName()
  try {
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($entry in $merged.GetEnumerator()) {
      $lines.Add("$($entry.Key)=$($entry.Value)")
    }
    Set-Content -LiteralPath $tmpFile -Value $lines

    $secretName = "$ReleaseName-$service-env"
    kubectl -n $Namespace create secret generic $secretName --from-env-file="$tmpFile" --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    Write-Host "Secret applied: $secretName"
  }
  finally {
    Remove-Item -LiteralPath $tmpFile -ErrorAction SilentlyContinue
  }
}

Write-Host "Done. Secrets are ready for Helm deploy."
