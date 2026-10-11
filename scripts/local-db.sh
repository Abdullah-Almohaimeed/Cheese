#!/usr/bin/env bash
# Starts a throwaway local Postgres on port 54329 with databases "cheese" and "cheese_test".
# Usage: bash scripts/local-db.sh [start|stop|status]
set -euo pipefail

PORT="${CHEESE_PG_PORT:-54329}"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$BIN" ] || { echo "PostgreSQL server binaries not found. Install postgresql or point DATABASE_URL at any Postgres." >&2; exit 1; }

if [ "$(id -u)" = "0" ]; then
  DATA="${CHEESE_PG_DIR:-/var/tmp/cheese-pg}"
  RUN="runuser -u postgres --"
  mkdir -p "$DATA" && chown postgres:postgres "$DATA"
else
  DATA="${CHEESE_PG_DIR:-$(pwd)/.data/pg}"
  RUN=""
  mkdir -p "$DATA"
fi

cmd="${1:-start}"
case "$cmd" in
  start)
    if [ ! -f "$DATA/PG_VERSION" ]; then
      $RUN "$BIN/initdb" -D "$DATA" -A trust -U postgres >/dev/null
    fi
    if ! $RUN "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
      $RUN "$BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$DATA/server.log" -w start >/dev/null
    fi
    for db in cheese cheese_test; do
      psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
        || psql -h 127.0.0.1 -p "$PORT" -U postgres -qc "create database $db"
    done
    echo "postgres://postgres@127.0.0.1:$PORT/cheese"
    ;;
  stop) $RUN "$BIN/pg_ctl" -D "$DATA" -m fast stop ;;
  status) $RUN "$BIN/pg_ctl" -D "$DATA" status ;;
  *) echo "usage: $0 [start|stop|status]" >&2; exit 1 ;;
esac
