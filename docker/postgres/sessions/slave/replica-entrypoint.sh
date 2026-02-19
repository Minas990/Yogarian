#!/bin/bash
set -euo pipefail

PRIMARY_HOST="${PG_PRIMARY_HOST:-postgres-sessions}"
PRIMARY_PORT="${PG_PRIMARY_PORT:-5432}"
PRIMARY_USER="${PG_PRIMARY_USER:-sessions}"
PRIMARY_PASSWORD="${PG_PRIMARY_PASSWORD:-sessions}"

if [ ! -f "$PGDATA/standby.signal" ]; then
  echo "Initializing standby from ${PRIMARY_HOST}:${PRIMARY_PORT}..."

  rm -rf "${PGDATA:?}"/*

  until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER"; do
    echo "Waiting for primary..."
    sleep 2
  done

  export PGPASSWORD="$PRIMARY_PASSWORD"
  until pg_basebackup -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -D "$PGDATA" -U "$PRIMARY_USER" -Fp -Xs -P -R; do
    echo "Retrying pg_basebackup..."
    sleep 2
  done

  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
fi

exec docker-entrypoint.sh postgres -c hot_standby=on
