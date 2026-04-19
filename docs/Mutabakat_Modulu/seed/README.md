# Pilot PriceBook Seed — Mutabakat Modülü

- **Tarih:** 2026-04-19
- **Kapsam:** Sprint 2 Task 3 (D.1 kararı) — Fiyat Arama + Sprint 2 Case/Line lookup'ının pilot demo için gerçek sonuç üretebilmesi
- **Amaç:** 3 sigorta + 3 otomotiv müşterisi için aktif PriceBook + kalemler

---

## İçerik

| Dosya | Müşteri | Flow | Kalem Sayısı |
|---|---|---|---|
| `items-insurance-mapfre.csv` | Mapfre Sigorta | Insurance | 7 |
| `items-insurance-aksigorta.csv` | AK Sigorta | Insurance | 6 |
| `items-insurance-anadolu.csv` | Anadolu Sigorta | Insurance | 7 |
| `items-automotive-toyota.csv` | Toyota | Automotive | 8 |
| `items-automotive-renault.csv` | Renault | Automotive | 6 |
| `items-automotive-dogus.csv` | Doğuş Oto | Automotive | 7 |

**Toplam:** 6 PriceBook × ortalama 7 kalem = ~41 mock fiyat kalemi.

---

## Kullanım Notu — Mock Fiyatlar

CSV içindeki `unit_price` değerleri **pilot demo + smoke test amaçlı**. Sprint 2 E2E akışının ve Fiyat Arama doğrulamasının çalışabilmesi için gerçekçi ama **gerçek sözleşme fiyatı değil**. Gerçek operasyona geçmeden önce muhasebe ekibiyle birlikte güncellenmelidir.

KVKK açısından hassas değil — ürün kodları + adları tur asistans/otomotiv sektörünün kamuya açık terminolojisi.

---

## Yükleme Akışı (Manuel — Sprint 2'nin ilk günü)

Yükleme dört adımlı. Her müşteri için aynı akış tekrarlanır. Şu an **manuel** (curl/Postman); Sprint 3'te `scripts/seed-pricebook-pilot.sh` otomasyonu eklenebilir (opsiyonel).

### Ön koşul — Customer + Product kayıtları

```sql
-- Postgres'te kontrol et (docker-compose.dev.yml, port 5435):
psql -h localhost -p 5435 -U budgettracker budgettracker_dev -c \
  "SELECT id, code, name FROM customers WHERE code IN
   ('MAPFRE','AKSIGORTA','ANADOLU','TOYOTA','Renault','DOĞUŞ') ORDER BY code;"
```

Şifre: `budgettracker_dev_password` (dev environment).

Tüm müşterilerin mevcut olduğu doğrulandı — `/pricing/lookup` sayfasında 90+ müşteri dropdown'da görünüyor.

**Product:** Her Contract bir `ProductId` gerektirir (ADR-0013). Pilot için uygun bir product (ör. "Asistans Hizmet" jenerik) yoksa önce Ürünler sayfasından oluştur veya seed'e ekle.

### 1. Token al

```bash
curl -X POST http://localhost:5000/connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password&username=admin@tag.local&password=Devpass!2026&scope=api offline_access roles' \
  | jq -r '.access_token' > /tmp/token.txt
export TOKEN=$(cat /tmp/token.txt)
```

### 2. Contract oluştur (her müşteri için bir kez)

`CreateContractRequest` 14-segment ADR-0014 contract code üretir; tüm enum alanları zorunlu. Örnek (Mapfre Sigorta):

```bash
curl -X POST http://localhost:5000/api/v1/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": 5,
    "productId": 1,
    "businessLine": "Insurance",
    "salesType": "Insurance",
    "productType": "Assistance",
    "vehicleType": "NA",
    "contractForm": "Standard",
    "contractType": "FrameAgreement",
    "paymentFrequency": "Monthly",
    "adjustmentClause": "CPI",
    "contractKind": "Service",
    "serviceArea": "Nationwide",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "contractName": "Mapfre Sigorta — Pilot Çerçeve 2026",
    "currencyCode": "TRY",
    "initialStatus": "Active"
  }' | jq .
```

→ Dönen JSON'daki `id` değerini kaydet (ör. `contractId=12`).

**Enum değerler:** Tam liste için `GET /api/v1/contracts/parse/{code}` endpoint'i veya `Core/Enums/Contracts/` altındaki enum dosyalarına bak.

### 3. PriceBook Draft oluştur

```bash
curl -X POST "http://localhost:5000/api/v1/contracts/$CONTRACT_ID/price-books" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "notes": "Pilot seed Sprint 2"
  }' | jq .
```

→ `priceBookId` kaydet.

### 4. CSV import (bu klasördeki dosya)

```bash
curl -X POST "http://localhost:5000/api/v1/price-books/$PRICEBOOK_ID/items/import?replaceExisting=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@docs/Mutabakat_Modulu/seed/items-insurance-mapfre.csv"
```

### 5. PriceBook'u Approve et

```bash
curl -X POST "http://localhost:5000/api/v1/price-books/$PRICEBOOK_ID/approve" \
  -H "Authorization: Bearer $TOKEN"
```

Not: Approve adımı `PriceBook.Approve` policy'sini gerektirir → **Admin veya Cfo** olarak giriş yapılmalı. ReconAgent bu adımı atlayamaz (spec 00c §4 — görev ayrılığı).

---

## Doğrulama

Tüm 6 sözleşme Active'e geçtikten sonra:

```bash
# Fiyat Arama API — Mapfre + Standart paket + 2026-04 dönemi
curl "http://localhost:5000/api/v1/pricing/lookup?customer_id=5&flow=Insurance&period_code=2026-04&product_code=PKT-STD" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Beklenen: `{"match":"Found","priceBookItem":{"unitPrice":125.00,...}}`.

UI doğrulama: `http://localhost:3000/pricing/lookup` sayfasında müşteri=Mapfre, akış=Sigorta, ürün=PKT-STD → "Eşleşme Bulundu" chip'i yeşil görünür.

---

## Hızlı Kontrol Listesi

- [ ] 6 müşteri kaydının `customers` tablosunda var olduğunu doğrula
- [ ] Her müşteri için bir Contract oluştur (Active statü)
- [ ] Her Contract için bir PriceBook Draft oluştur
- [ ] Her PriceBook'a ilgili CSV'yi import et
- [ ] Her PriceBook'u Approve et (Admin/Cfo)
- [ ] Fiyat Arama smoke test: 6 müşteri × en az 1 ürün → "Found"
- [ ] Sprint 2 Task 5 (PriceBook lookup integration) test fixture olarak bu seed kullanılabilir

---

## Follow-up TODO

- **Seed otomasyonu:** `scripts/seed-pricebook-pilot.sh` — manuel curl akışını shell'e çevir. Sprint 3'e ertelendi.
- **Gerçek fiyat güncelleme:** Muhasebe ekibiyle seans, mock değerlerin gerçek sözleşme fiyatlarına çevrilmesi. Pilot canlıya geçmeden önce yapılmalı.
- **Enum referans dokumentasyonu:** CreateContractRequest enum değerlerinin kolay erişilebilir listesi (`docs/user-guide/contract-enums.md` önerisi).
