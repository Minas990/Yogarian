# CLEAN Database Containers and Volumes Script

Write-Host "Stopping and removing Postgres database containers..." -ForegroundColor Yellow

# Stop Postgres containers
docker stop yoga-postgres-users yoga-postgres-auth yoga-postgres-media yoga-postgres-location yoga-postgres-sessions yoga-postgres-sessions-slave 2>$null

# Remove Postgres containers
docker rm yoga-postgres-users yoga-postgres-auth yoga-postgres-media yoga-postgres-location yoga-postgres-sessions yoga-postgres-sessions-slave 2>$null

Write-Host "Postgres containers removed." -ForegroundColor Green

Write-Host "Removing Postgres database volumes..." -ForegroundColor Yellow

# Remove Postgres volumes
docker volume rm yoga_postgres-users-data yoga_postgres-auth-data yoga_postgres-media-data yoga_postgres-location-data yoga_postgres-sessions-data yoga_postgres-sessions-slave-data 2>$null

Write-Host "Postgres volumes removed." -ForegroundColor Green
Write-Host "Database cleanup complete!" -ForegroundColor Cyan
