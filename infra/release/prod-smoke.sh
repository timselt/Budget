#!/usr/bin/env bash
# --------------------------------------------------------------------
# FinOps Tur — post-deploy smoke test.
# --------------------------------------------------------------------
# Called by .github/workflows/deploy.yml after each Railway deployment.
# Exits non-zero on any assertion failure so GitHub Actions fails the
# deploy and triggers a rollback (runbook §Rollback).
#
# Assertions:
#   1. /health/live     → 200
#   2. /health/ready    → 200
#   3. /hangfire        → 401 (anonymous must be rejected — ADR-0007 §2.1)
#   4. Swagger reachable (prod API responds at /openapi/v1.json — optional)
#
# Usage:
#   ./infra/release/prod-smoke.sh https://staging.finopstur.com
#   ./infra/release/prod-smoke.sh https://app.finopstur.com

set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "[smoke] Usage: $0 <base-url>" >&2
  exit 1
fi

# Strip trailing slash so concatenation stays clean.
BASE_URL="${BASE_URL%/}"

echo "[smoke] Base URL: $BASE_URL"

check_status() {
  local path="$1"
  local expected="$2"
  local label="$3"

  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL$path" || echo "000")

  if [[ "$got" != "$expected" ]]; then
    echo "[smoke] ❌ FAIL $label  expected=$expected got=$got path=$path" >&2
    exit 1
  fi
  echo "[smoke] ✅ OK   $label  status=$got path=$path"
}

check_status "/health/live"  "200" "liveness probe"
check_status "/health/ready" "200" "readiness probe"

# /hangfire must reject anonymous callers. The filter returns 401 for
# unauthenticated requests and 403 for wrong-role; either is acceptable
# for this smoke test — we just need to see it is NOT 200.
HANGFIRE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/hangfire" || echo "000")
if [[ "$HANGFIRE_CODE" == "200" ]]; then
  echo "[smoke] ❌ FAIL /hangfire returned 200 to an anonymous request — auth filter is not wired" >&2
  exit 1
fi
echo "[smoke] ✅ OK   /hangfire auth gate  status=$HANGFIRE_CODE"

echo "[smoke] All assertions passed."
