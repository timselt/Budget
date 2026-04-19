#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.local/dev"
API_PID_FILE="$RUNTIME_DIR/api.pid"
CLIENT_PID_FILE="$RUNTIME_DIR/client.pid"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[dev-down] Stopping $label (pid=$pid)..."
    kill "$pid" >/dev/null 2>&1 || true
  fi

  rm -f "$pid_file"
}

cd "$ROOT_DIR"

stop_pid_file "$API_PID_FILE" "API"
stop_pid_file "$CLIENT_PID_FILE" "Client"

if [ "${1:-}" = "--with-docker" ]; then
  echo "[dev-down] Stopping docker services..."
  docker compose -f docker-compose.dev.yml down
fi

echo "[dev-down] Done"
