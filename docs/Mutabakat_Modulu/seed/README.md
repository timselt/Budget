# Pilot PriceBook Seed — Mutabakat Modülü

- **Güncelleme:** 2026-04-21 (eski 6-müşteri mock PR #34 kapsamı yerine 89-müşteri tam seed ile değiştirildi)
- **Kapsam:** PR #41 (seed-89-pilot-customers) ile 89 gerçek müşteri Supabase'e seed edildikten sonra her müşteri için **tek bir** placeholder fiyat listesi kurulması
- **Amaç:** Fiyat Arama + Mutabakat Case/Line pricing lookup akışının pilot demo için gerçek sonuç üretebilmesi. Gerçek fiyatlar muhasebe ekibi tarafından sonra eklenir.

---

## İçerik

### `items-pilot-placeholder.csv` (yeni)
Tüm 89 müşteri için **aynı** fiyat listesi. 11 ürün varyantı × placeholder TL:

| Ürün Kodu | Ürün Adı | Birim Fiyat (placeholder) |
|---|---|---|
| YOLYARD-30 | Yol Yardım 30 km | 100 ₺ |
| YOLYARD-60 | Yol Yardım 60 km | 150 ₺ |
| YOLYARD-UNLTD | Yol Yardım Sınırsız | 250 ₺ |
| IKAMARAC-1G | İkame Araç 1 Gün | 300 ₺ |
| IKAMARAC-3G | İkame Araç 3 Gün | 800 ₺ |
| IKAMARAC-7G | İkame Araç 7 Gün | 1.500 ₺ |
| KONUT-STD | Konut Asistans Standart | 200 ₺ |
| KONUT-KAPS | Konut Asistans Kapsamlı | 400 ₺ |
| WARRANTY-1Y | Warranty 1 Yıl | 500 ₺ |
| WARRANTY-2Y | Warranty 2 Yıl | 900 ₺ |
| WARRANTY-3Y | Warranty 3 Yıl | 1.200 ₺ |

**Önemli:** Fiyatlar tamamen **yer tutucu (placeholder)**. Muhasebe ekibi gerçek fiyatları sonra güncelleyecek. Pilot demo + smoke test amaçlı.

**Item Type:** Hepsi `Other` — 4 müşteri kategorisi (Sigorta/Otomotiv/Filo/Alternatif) için cross-kategori kullanım. Üretim hattında kategori-spesifik bölünebilir.

---

## Kurulum Rehberi (89 müşteri için)

### Ön koşul
- PR #40 merge edilmiş (Filo + Alternatif akışları aktif)
- PR #41 merge edilmiş (89 müşteri seed)
- **Migration `20260421_03_seed_pilot_products` akmış** → 4 ana ürün (YOL_YARDIM, IKAME_ARAC, KONUT_ASISTANS, WARRANTY) veritabanında hazır
- Local dev DB veya Supabase prod DB migration'ları son sürümde
- Admin kullanıcısı mevcut (dev: `admin@tag.local` / `Devpass!2026`)

**Not:** Ürün master seed'i otomatik yürür; bu rehber sadece Contract + PriceBook setup'ını kapsar (89 × 1 sözleşme + 89 × 1 fiyat listesi + 89 × 11 fiyat kalemi).

### 1. Token al

```bash
curl -X POST http://localhost:5000/connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password&username=admin@tag.local&password=Devpass!2026&scope=api offline_access roles' \
  | jq -r '.access_token' > /tmp/token.txt
export TOKEN=$(cat /tmp/token.txt)
```

### 2. Her müşteri için Contract + PriceBook (batch script)

89 müşteri olduğu için manuel curl yerine script kullan. Basit bash:

```bash
# Müşteri listesini DB'den çek
export PGPASSWORD=budgettracker_dev_password
CUSTOMERS=$(psql -h localhost -p 5435 -U budgettracker budgettracker -A -t -c \
  "SELECT id, code, category_code FROM customers WHERE short_id BETWEEN 1 AND 89 ORDER BY short_id;")

while IFS='|' read -r CUST_ID CUST_CODE CATEGORY; do
  [ -z "$CUST_ID" ] && continue

  # 2.1 Contract oluştur (müşterinin kategorisine uygun SalesType)
  case "$CATEGORY" in
    Sigorta)    SALES_TYPE="Insurance"; PRODUCT_TYPE="Assistance" ;;
    Otomotiv)   SALES_TYPE="Automotive"; PRODUCT_TYPE="Warranty" ;;
    Filo)       SALES_TYPE="Fleet"; PRODUCT_TYPE="Assistance" ;;
    Alternatif) SALES_TYPE="DirectChannel"; PRODUCT_TYPE="Assistance" ;;
  esac

  CONTRACT_ID=$(curl -s -X POST http://localhost:5000/api/v1/contracts \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{
      \"customerId\": $CUST_ID,
      \"productId\": 1,
      \"businessLine\": \"$SALES_TYPE\",
      \"salesType\": \"$SALES_TYPE\",
      \"productType\": \"$PRODUCT_TYPE\",
      \"vehicleType\": \"NA\",
      \"contractForm\": \"Standard\",
      \"contractType\": \"FrameAgreement\",
      \"paymentFrequency\": \"Monthly\",
      \"adjustmentClause\": \"CPI\",
      \"contractKind\": \"Service\",
      \"serviceArea\": \"Nationwide\",
      \"startDate\": \"2026-01-01\",
      \"endDate\": \"2026-12-31\",
      \"contractName\": \"$CUST_CODE — Pilot Çerçeve 2026\",
      \"currencyCode\": \"TRY\",
      \"initialStatus\": \"Active\"
    }" | jq -r '.id')

  # 2.2 PriceBook Draft
  PB_ID=$(curl -s -X POST "http://localhost:5000/api/v1/contracts/$CONTRACT_ID/price-books" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"effectiveFrom": "2026-01-01", "effectiveTo": null, "notes": "Pilot placeholder seed"}' \
    | jq -r '.id')

  # 2.3 CSV import (aynı dosya, 11 kalem)
  curl -s -X POST "http://localhost:5000/api/v1/price-books/$PB_ID/items/import?replaceExisting=true" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@docs/Mutabakat_Modulu/seed/items-pilot-placeholder.csv" >/dev/null

  # 2.4 Approve (Admin/Cfo policy)
  curl -s -X POST "http://localhost:5000/api/v1/price-books/$PB_ID/approve" \
    -H "Authorization: Bearer $TOKEN" >/dev/null

  echo "✅ $CUST_CODE → Contract $CONTRACT_ID, PriceBook $PB_ID"
done <<< "$CUSTOMERS"
```

### Doğrulama

```bash
# Fiyat Arama API — bir Sigorta müşterisiyle deneme
curl "http://localhost:5000/api/v1/pricing/lookup?customer_id=1&flow=Insurance&period_code=2026-04&product_code=YOLYARD-30" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Beklenen: { "unitPrice": 100.00, "currencyCode": "TRY", ... }

# Filo müşterisi
curl "http://localhost:5000/api/v1/pricing/lookup?customer_id=47&flow=Filo&period_code=2026-04&product_code=YOLYARD-30" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Eski 6-müşteri mock CSV'leri

Önceki sürümde `items-insurance-mapfre.csv`, `items-automotive-toyota.csv` gibi 6 ayrı mock dosya vardı. Bu sürümde kaldırıldı çünkü:
- 89 müşteri × aynı placeholder fiyat = tek dosya yeterli
- Gerçek müşteri listesi artık ButceMusteriler.xlsx'ten seed edildi (PR #41)
- Kategori-spesifik farklılaştırma gerektiğinde muhasebe ekibi gerçek veriyi getirecek
