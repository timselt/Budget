#!/usr/bin/env bash
# --------------------------------------------------------------------
# FinOps Tur — Shadow Run Ön-Koşul §0 otomasyonu.
# --------------------------------------------------------------------
# Shadow run raporunun §0 Ön-koşul Kontrolü bölümünü otomatik doğrular.
# 4 otomatik madde + 2 manuel hatırlatıcı.
#
# Usage:
#   ./infra/release/check-prerequisites.sh https://staging.finopstur.com

set -uo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 <base-url>" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"

  printf "  [ ] %s ... " "$label"
  if eval "$cmd" >/dev/null 2>&1; then
    printf "\r  [✓] %s          \n" "$label"
    PASS=$((PASS + 1))
  else
    printf "\r  [✗] %s          \n" "$label"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Shadow Run Ön-Koşul §0 Doğrulaması"
echo "Base: $BASE_URL"
echo "------------------------------------"

# 1. Staging deploy başarılı mı — /health/live 200 + /health/ready 200
check "deploy-staging job yeşil (/health/live 200)" \
  "[ \"\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $BASE_URL/health/live)\" = '200' ]"

# 2. prod-smoke.sh 3 assertion pass (/health/ready + /hangfire 401)
check "/health/ready 200" \
  "[ \"\$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $BASE_URL/health/ready)\" = '200' ]"

check "/hangfire anonymous reddedildi (!= 200)" \
  "hc=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $BASE_URL/hangfire); [ \"\$hc\" != '200' ]"

# 3. Seq ingest — staging'de opsiyonel, production'da zorunlu
if [[ "${BASE_URL}" == *"app.finopstur"* ]] || [[ "${BASE_URL}" == *"production"* ]]; then
  if [[ -n "${SEQ_URL:-}" && -n "${SEQ_API_KEY:-}" ]]; then
    check "seq-ingest-check.sh (production)" \
      "./infra/release/seq-ingest-check.sh '$SEQ_URL' '$SEQ_API_KEY'"
  else
    echo "  [!] seq-ingest-check atlandı — SEQ_URL ve SEQ_API_KEY env vars eksik (production'da zorunlu)"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  [-] seq-ingest-check atlandı (staging opsiyonel)"
fi

# 4. Muhasebe kararları prod'da (CLAUDE.md ve accounting-session-decisions dosyası main'de)
check "muhasebe seansı kararları commit'te" \
  "[ -f docs/accounting-session-decisions-2026-04-17.md ] && grep -q 'Müşteri Konsantrasyon' CLAUDE.md"

echo "------------------------------------"
echo "Otomatik: $PASS pass, $FAIL fail"
echo ""
echo "MANUEL KONTROL GEREKTİREN:"
echo "  [ ] SGK Teşvik müşteri kaydı prod'da mı?"
echo "       → SPA /master-data → Customers → code=SGK-TESVIK"
echo "  [ ] Master data init tamamlandı mı?"
echo "       → Müşteri + segment + expense kategori sayıları Excel ile tutarlı mı?"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo "✅ Otomatik ön-koşullar yeşil. Manuel 2 maddeyi muhasebe ekibi ile doğrulayın, sonra shadow run §1 karşılaştırmasına geçin."
  exit 0
else
  echo "❌ $FAIL otomatik ön-koşul başarısız — shadow run başlatma, önce düzelt."
  echo "   Troubleshooting: docs/deployment-setup-guide.md §Troubleshooting"
  exit 1
fi
