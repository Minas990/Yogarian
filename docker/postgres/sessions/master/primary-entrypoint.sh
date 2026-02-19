#!/bin/bash
set -euo pipefail

if [ -f "$PGDATA/pg_hba.conf" ]; then
  SESSIONS_RULE="host replication sessions 0.0.0.0/0 md5"
  REPLICATOR_RULE="host replication replicator 0.0.0.0/0 md5"

  grep -Fqx "$SESSIONS_RULE" "$PGDATA/pg_hba.conf" || echo "$SESSIONS_RULE" >> "$PGDATA/pg_hba.conf"
  grep -Fqx "$REPLICATOR_RULE" "$PGDATA/pg_hba.conf" || echo "$REPLICATOR_RULE" >> "$PGDATA/pg_hba.conf"
fi

exec docker-entrypoint.sh postgres "$@"
