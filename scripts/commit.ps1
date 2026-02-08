$repoRoot = Resolve-Path "$PSScriptRoot\.."
$commitFile = Join-Path $repoRoot ".next commit"

if (-Not (Test-Path $commitFile)) {
    Write-Error "File '.next commit' not found in repository root"
    exit 1
}

$message = Get-Content $commitFile -Raw
$message = $message.Trim()

if ([string]::IsNullOrWhiteSpace($message)) {
    Write-Error "Commit message is empty in '.next commit'"
    exit 1
}

Set-Location $repoRoot
git commit -m $message
