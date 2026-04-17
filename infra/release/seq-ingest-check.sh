#!/usr/bin/env bash
# --------------------------------------------------------------------
# FinOps Tur — Seq ingest verification (post-deploy).
# --------------------------------------------------------------------
# Confirms that the production API has written at least one log event
# to Seq in the last 2 minutes. If this fails, the deploy is treated
# as unsuccessful (observability blind) and the workflow marks it red.
#
# Usage:
#   ./infra/release/seq-ingest-check.sh https://seq.finopstur.com <api-key>

set -euo pipefail

SEQ_URL="${1:-}"
API_KEY="${2:-}"

if [[ -z "$SEQ_URL" || -z "$API_KEY" ]]; then
  echo "[seq-check] Usage: $0 <seq-url> <api-key>" >&2
  exit 1
fi

SEQ_URL="${SEQ_URL%/}"

# Seq query API — events in the last 2 minutes with Application='BudgetTracker.Api'.
QUERY='Application = "BudgetTracker.Api"'
SINCE=$(date -u -v-2M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '2 minutes ago' +%Y-%m-%dT%H:%M:%SZ)

RESULT=$(curl -s --max-time 20 \
  -H "X-Seq-ApiKey: $API_KEY" \
  --data-urlencode "filter=$QUERY" \
  --data-urlencode "fromDateUtc=$SINCE" \
  --data-urlencode "count=1" \
  -G "$SEQ_URL/api/events" || echo "[]")

COUNT=$(echo "$RESULT" | grep -c '"Id"' || true)

if [[ "$COUNT" -lt 1 ]]; then
  echo "[seq-check] ❌ No events from BudgetTracker.Api in the last 2 minutes — ingest broken or API silent." >&2
  exit 1
fi

echo "[seq-check] ✅ Seq ingest healthy — $COUNT recent event(s) from BudgetTracker.Api."
