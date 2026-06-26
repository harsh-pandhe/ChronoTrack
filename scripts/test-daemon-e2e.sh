#!/usr/bin/env bash
# End-to-end daemon cloud-sync test: ephemeral Postgres + Node ingest + Python daemon.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_NAME=chronotrack_daemon_pg
PG_PORT=5545
export DATABASE_URL="postgres://postgres:test@localhost:${PG_PORT}/chronotrack"
export PGSSL=disable
export JWT_SECRET="daemon-e2e-secret"
export CREDS_FILE="$(mktemp /tmp/ct_creds.XXXX.json)"

cleanup() {
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  rm -f "$CREDS_FILE"
}
trap cleanup EXIT

echo "==> Starting ephemeral Postgres"
docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
docker run -d --name "$PG_NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chronotrack \
  -p ${PG_PORT}:5432 postgres:16-alpine >/dev/null
for i in $(seq 1 30); do
  docker exec "$PG_NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

echo "==> Starting Node ingest server (seeds activated device)"
node scripts/serve-test-ingest.js &
SERVER_PID=$!
for i in $(seq 1 30); do [[ -s "$CREDS_FILE" ]] && break; sleep 0.5; done
[[ -s "$CREDS_FILE" ]] || { echo "server failed to write creds"; exit 1; }

echo "==> Running Python daemon sync E2E"
python3 scripts/test_daemon_sync.py
