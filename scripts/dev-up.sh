#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.local/dev"
API_LOG="$RUNTIME_DIR/api.log"
CLIENT_LOG="$RUNTIME_DIR/client.log"
API_PID_FILE="$RUNTIME_DIR/api.pid"
CLIENT_PID_FILE="$RUNTIME_DIR/client.pid"
API_DLL="$ROOT_DIR/src/BudgetTracker.Api/bin/Debug/net10.0/BudgetTracker.Api.dll"
API_CONTENT_ROOT="$ROOT_DIR/src/BudgetTracker.Api"

mkdir -p "$RUNTIME_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

port_is_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

start_background() {
  local pid_file="$1"
  local log_file="$2"
  shift 2

  nohup "$@" >"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"
}

wait_for_http() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "$label did not become ready: $url" >&2
  return 1
}

ensure_process_alive() {
  local pid_file="$1"
  local label="$2"
  local log_file="$3"

  if [ ! -f "$pid_file" ]; then
    echo "$label pid file missing: $pid_file" >&2
    exit 1
  fi

  local pid
  pid="$(cat "$pid_file")"
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "$label exited unexpectedly. Last log lines:" >&2
    tail -n 40 "$log_file" >&2 || true
    exit 1
  fi
}

require_cmd docker
require_cmd dotnet
require_cmd pnpm
require_cmd lsof
require_cmd curl

cd "$ROOT_DIR"

echo "[dev-up] Starting docker services..."
docker compose -f docker-compose.dev.yml up -d

echo "[dev-up] Applying database migrations..."
dotnet ef database update \
  --project src/BudgetTracker.Infrastructure \
  --startup-project src/BudgetTracker.Api

echo "[dev-up] Building API..."
dotnet build src/BudgetTracker.Api/BudgetTracker.Api.csproj --no-restore >/dev/null

if port_is_listening 5100; then
  echo "[dev-up] API already listening on :5100"
else
  echo "[dev-up] Starting API..."
  start_background "$API_PID_FILE" "$API_LOG" \
    env ASPNETCORE_ENVIRONMENT=Development \
    dotnet "$API_DLL" --contentRoot "$API_CONTENT_ROOT" --urls http://localhost:5100
fi

wait_for_http "http://localhost:5100/health/ready" "API"
if [ -f "$API_PID_FILE" ]; then
  ensure_process_alive "$API_PID_FILE" "API" "$API_LOG"
fi

if port_is_listening 3000; then
  echo "[dev-up] Client already listening on :3000"
else
  echo "[dev-up] Ensuring client dependencies..."
  if [ ! -d "$ROOT_DIR/client/node_modules" ]; then
    (cd "$ROOT_DIR/client" && pnpm install)
  fi

  echo "[dev-up] Starting client..."
  (
    cd "$ROOT_DIR/client"
    start_background "$CLIENT_PID_FILE" "$CLIENT_LOG" pnpm dev
  )
fi

wait_for_http "http://localhost:3000" "Client"
if [ -f "$CLIENT_PID_FILE" ]; then
  ensure_process_alive "$CLIENT_PID_FILE" "Client" "$CLIENT_LOG"
fi

echo "[dev-up] Ready"
echo "  SPA: http://localhost:3000"
echo "  API: http://localhost:5100"
echo "  API log: $API_LOG"
echo "  Client log: $CLIENT_LOG"
