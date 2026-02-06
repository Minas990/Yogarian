#cLEAN Database Containers and Volumes Script

Write-Host "Stopping and removing database containers..." -ForegroundColor Yellow

#stop and remove postgres containers
docker stop yoga-postgres-users yoga-postgres-auth 2>$null
docker rm yoga-postgres-users yoga-postgres-auth 2>$null

Write-Host "Database containers removed." -ForegroundColor Green

Write-Host "Removing database volumes..." -ForegroundColor Yellow

#remove postgres volumes
docker volume rm yoga_postgres-users-data yoga_postgres-auth-data 2>$null

Write-Host "Database volumes removed." -ForegroundColor Green
Write-Host "Database cleanup complete!" -ForegroundColor Cyan
