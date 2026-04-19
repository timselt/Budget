# Önkoşul Spec #2 — PriceBook Altyapısı

- **Tarih:** 2026-04-19
- **Durum:** Hazır, uygulanmayı bekliyor
- **Bağlı olduğu:** [`01_phase1_domain_model.md`](./01_phase1_domain_model.md) §3.5 (ReconciliationLine.unit_price, price_source_ref)
- **Amaç:** Mutabakat import edildiğinde her satırın sözleşme + ürün/hizmet + birim fiyat üçlüsü ile deterministik olarak eşlenebilmesini sağlamak.

## 1. Neden Gerekli?

Faz 1'in çekirdek iş mantığı **"sözleşmedeki fiyatla mı uyumlu?"** sorusunun cevabını verebilmek. Bugün bu bilgi:
- sözleşme Word dosyalarında
- muhasebede manuel tablolarda
- mutabakat ekibinin kafasında

Bunu tek yerde, versiyonlu ve sorgulanabilir hale getirmek şart.

## 2. Veri Modeli

### 2.1 Entity'ler

#### `Contract` (mevcut ise genişlet, yoksa yeni)

Mevcut proje içinde `Contract` entity'si var mı kontrol edilmeli; yoksa aşağıdaki minimum şema:

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `company_id` | UUID | ✓ |
| `customer_id` | UUID | ✓ |
| `contract_code` | varchar(32) | ✓ |
| `contract_name` | varchar(255) | ✓ |
| `flow` | enum | ✓ | `Insurance` / `Automotive` |
| `effective_from` | date | ✓ |
| `effective_to` | date | — |
| `currency_code` | char(3) | ✓ |
| `status` | enum | ✓ | `Draft` / `Active` / `Expired` / `Terminated` |

Unique: `(company_id, contract_code)`.

#### `PriceBook`

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `contract_id` | UUID | ✓ |
| `version_no` | int | ✓ | Her değişiklikte +1 |
| `effective_from` | date | ✓ |
| `effective_to` | date | — |
| `status` | enum | ✓ | `Draft` / `Active` / `Archived` |
| `created_by` | UUID | ✓ |
| `created_at` | timestamptz | ✓ |
| `approved_by` | UUID | — |
| `approved_at` | timestamptz | — |

Bir `Contract` için aynı anda yalnızca bir `Active` PriceBook olmalı (EXCLUDE USING gist ile garanti).

#### `PriceBookItem`

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `price_book_id` | UUID | ✓ |
| `product_code` | varchar(64) | ✓ |
| `product_name` | varchar(255) | ✓ |
| `item_type` | enum | ✓ | `InsurancePackage` / `AutomotiveService` / `Other` |
| `unit` | varchar(16) | ✓ | `PCS`, `USE`, `MONTH`, vb. |
| `unit_price` | decimal(18,4) | ✓ |
| `currency_code` | char(3) | ✓ |
| `tax_rate` | decimal(5,2) | — | KDV % |
| `min_quantity` | decimal(18,4) | — | Minimum sözleşme adedi (varsa) |
| `notes` | text | — |

Unique: `(price_book_id, product_code)`.

### 2.2 Versiyonlama Mantığı

- Sözleşme fiyatı değiştiğinde yeni **PriceBook** versiyonu oluşur, eski olan `Archived` olur.
- `effective_from` geleceğe de yazılabilir (fiyat değişikliğini önceden sisteme girme).
- Mutabakat `period_code`'a göre **o dönemde geçerli** `PriceBook.Active` sürümünü kullanır. Yani eski dönem mutabakatı eski fiyatla hesaplanır — tarihsel doğruluk korunur.

### 2.3 Eşleme Algoritması (Mutabakat Import Sırasında)

```
input: case.customer_id, case.period_code, line.product_code

1. customer → contract (flow bazlı, aktif olanlar arasından)
   SELECT c FROM contracts
   WHERE customer_id=? AND flow=?
     AND effective_from <= period_start
     AND (effective_to IS NULL OR effective_to >= period_end)
     AND status IN ('Active')

2. contract → price_book (o dönemde geçerli)
   SELECT pb FROM price_books
   WHERE contract_id=?
     AND effective_from <= period_start
     AND (effective_to IS NULL OR effective_to >= period_end)
     AND status='Active'

3. price_book + product_code → item
   SELECT i FROM price_book_items
   WHERE price_book_id=? AND product_code=?

4. Sonuçlar:
   - Eşleşme bulundu → line.unit_price = item.unit_price; line.status=Ready
   - item.unit_price ≠ kaynaktaki unit_price_expected → line.status=PricingMismatch
   - contract yok → line.status=Rejected, reason=CONTRACT_NOT_FOUND
   - item yok → line.status=Rejected, reason=PKG_NOT_IN_CONTRACT
   - birden fazla contract → ImportWarning (manuel seçim gerekir)
```

## 3. API Yüzeyi

### 3.1 Contract
- `GET  /api/v1/contracts?customer_id=&flow=&status=`
- `POST /api/v1/contracts`
- `GET  /api/v1/contracts/{id}`
- `PATCH /api/v1/contracts/{id}` (sadece `Draft` statüde)
- `POST /api/v1/contracts/{id}/activate`
- `POST /api/v1/contracts/{id}/terminate` body: `{reason, effectiveDate}`

### 3.2 PriceBook
- `GET  /api/v1/contracts/{contractId}/price-books`
- `POST /api/v1/contracts/{contractId}/price-books` — yeni Draft versiyon (önceki Active kopyalanarak başlatılabilir)
- `POST /api/v1/price-books/{id}/items/bulk` — Excel/CSV import
- `POST /api/v1/price-books/{id}/approve` — sadece `Admin` veya `Cfo`
- `GET  /api/v1/price-books/{id}/items?product_code=`

### 3.3 Lookup (import parser'ın kullandığı)
- `GET  /api/v1/pricing/lookup?customer_id=&flow=&period_code=&product_code=`

  Dönüş:
  ```json
  {
    "match": "Found" | "PricingMismatch" | "ContractNotFound" | "ProductNotFound" | "MultipleContracts",
    "contractId": "uuid",
    "priceBookId": "uuid",
    "priceBookItem": { ... },
    "warnings": []
  }
  ```

## 4. UI Ekranları

| Ekran | Kapsam | Öncelik |
|---|---|---|
| Contract Listesi | Müşteri × flow × statü filtresi | P0 |
| Contract Detay | Üst bilgi + aktif PriceBook özeti + geçmiş sürümler | P0 |
| PriceBook Düzenleme | Kalem grid'i, import/export, taslak → onay | P0 |
| Fiyat Arama Aracı | Mutabakat ekibinin hızlıca sözleşme fiyatını bulabileceği arama | P1 |

## 5. Seed Veri Gereksinimi (Faz 1 Başlamadan)

Pilot dönem için minimum:
- 3-5 sigorta şirketi sözleşmesi + aktif PriceBook
- 3-5 otomotiv müşterisi sözleşmesi + aktif PriceBook
- Her PriceBook'ta 5-20 kalem

Mutabakat modülü pilot'ta test edilebilmek için bu seed verinin hazır olması şart.

## 6. Veri Geçişi

- Mevcut bütçe modülünün `Contract` entity'si yoksa: yeni oluştur.
- Mevcut bütçe modülünün `Contract` entity'si varsa: `flow` alanı eklemek için migration gerekir.
- `PriceBook` ve `PriceBookItem` tamamen yeni.
- Mevcut Excel fiyat tabloları operasyon ekibi tarafından Excel'den CSV'ye aktarıp bulk import ile yüklenecek (Faz 1 başında tek seferlik).

## 7. Test Kriterleri

### Unit Test
- PriceBook versiyonlama: aktif sürüm unique
- Efektif tarih hesabı: geçmiş dönem mutabakatı eski fiyatla
- Lookup algoritması: 5 farklı eşleşme senaryosu

### Integration Test
- Bulk import: 100 kalemlik CSV'nin tamamı kabul edildi
- Lookup endpoint: 5ms altı
- Concurrent approval: aynı anda iki admin onaylarsa race condition engellenir

### UAT
- Operasyon ekibi 3 pilot sözleşmeyi sisteme girdi, onayladı
- Mutabakat ekibi lookup aracıyla fiyat bulabildi

## 8. Kabul Kriterleri

- [ ] 3 yeni entity (Contract varsa güncellendi)
- [ ] Migration + geri alma script'i
- [ ] 11 REST endpoint
- [ ] 4 UI ekranı
- [ ] Bulk CSV import parser
- [ ] Audit event: `PriceBookVersionCreated`, `PriceBookApproved`, `PriceBookItemsChanged`
- [ ] Integration test coverage %80+
- [ ] Pilot seed veri hazır (sigorta + otomotiv)

## 9. Tahmini Efor

| İş | Efor |
|---|---|
| Contract entity + migration | 1 gün |
| PriceBook + PriceBookItem entity + migration | 1 gün |
| Lookup algoritması + cache | 1 gün |
| API endpoint'leri (11 tane) | 2 gün |
| Bulk import parser | 1 gün |
| UI ekranları (4 tane) | 3 gün |
| Test + QA | 2 gün |
| **Toplam** | **11 gün (~2.5 hafta, 1 FTE)** |

## 10. Açık Sorular

- **Para birimi:** MVP'de TRY dışında bir fiyat var mı? (Öneri: TRY lock; FX conversion Faz 2.)
- **KDV:** Sistem net fiyatla mı brüt fiyatla mı çalışsın? (Öneri: net; KDV ayrı alan; Faz 2'de muhasebe aktarımında kullanılır.)
- **Onay akışı:** PriceBook onayı tek adım mı çok adımlı mı? (Öneri: Admin/Cfo tek onay; Faz 2'de ikili onay eklenebilir.)
- **Müşteriye görünürlük:** Müşteri kendi PriceBook'unu görebilsin mi? (Öneri: hayır, iç araç. Faz 3'te müşteri portalı.)
