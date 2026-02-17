Write-Host "Killing all Node.js processes..." -ForegroundColor Yellow

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "All Node processes killed and ports freed" -ForegroundColor Green
