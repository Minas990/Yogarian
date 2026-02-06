#!/bin/bash


echo "Stopping and removing database containers..."

docker stop yoga-postgres-users yoga-postgres-auth 2>/dev/null
docker rm yoga-postgres-users yoga-postgres-auth 2>/dev/null

echo "Database containers removed."

echo "Removing database volumes..."

docker volume rm yoga_postgres-users-data yoga_postgres-auth-data 2>/dev/null

echo "Database volumes removed."
echo "Database cleanup complete!"
