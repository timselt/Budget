# Faz 1 Teknik Spec — Mutabakat Yönetimi MVP

- **Tarih:** 2026-04-19
- **Durum:** Teknik taslak
- **Kapsam:** Mutabakat Yönetimi MVP (Faz 1). Fatura ve tahsilat takibi Faz 2-3'te ele alınır.
- **Bağlam:** [`../plans/2026-04-19-reconciliation-billing-collections-plan.md`](../plans/2026-04-19-reconciliation-billing-collections-plan.md)
- **İş akışı referansı:** [`../RECONCILIATION_BILLING_COLLECTIONS.md`](../RECONCILIATION_BILLING_COLLECTIONS.md)
- **Analiz referansı:** [`../../analysis/EXCEL_ANALYSIS.md`](../../analysis/EXCEL_ANALYSIS.md)

## 1. Hedef

Faz 1 sonunda sistem şunu yapabilir olmalı:

1. Mutabakat ekibi bir dönem (ör. 2026-04) için yeni mutabakat dosyası açar.
2. Sigorta akışında: sigorta şirketinin poliçe listesi yüklenir. Sözleşme fiyatları ile eşleştirilir. Her satır için faturalanacak `ürün + adet + birim fiyat + toplam` hesaplanır.
3. Otomotiv akışında: TARS / Power BI kullanım raporu yüklenir. Sözleşme hizmet bedelleri ile eşleştirilir. Aynı çıktı (ürün/hizmet + adet + birim fiyat + toplam) hesaplanır.
4. Mutabakat ekibi her satırı gözden geçirir, gerekiyorsa notla müşteriye gönderir.
5. Müşteri onayı sonrasında satır `ReadyForAccounting` statüsüne geçer.
6. Muhasebeye aktarım paketi (Excel/CSV veya API) üretilir.
7. Tüm bu adımlar kullanıcı/tarih bazlı audit izine sahip olur.

Faz 1 için **faturanın kesilmesi ve tahsilatı kapsam dışıdır**. Bu statüler sonraki fazlarda devreye girer.

## 2. Domain Dili (Ubiquitous Language)

Takım içinde terim karışıklığı olmaması için sözlük:

| Terim | Anlam | Notlar |
|---|---|---|
| **Flow** | Mutabakat iş akışı türü | `Insurance` veya `Automotive` |
| **Batch** | Tek bir yükleme paketi | Bir Excel/CSV import |
| **Case** | Müşteri + dönem bazlı mutabakat dosyası | Satırların toplandığı çatı |
| **Line** | Tek bir faturalanacak kalem | Ürün/hizmet + adet + birim fiyat + toplam |
| **Decision** | Line üzerine verilen karar | UnderControl / Approved / Disputed / vb. |
| **AccountingInstruction** | Muhasebeye giden net kayıt | Case kapandıktan sonra üretilir |
| **PriceSource** | Sözleşme fiyatlarının kaynağı | Sigorta sözleşmesi veya otomotiv hizmet bedeli tablosu |
| **Party** | Dış taraf | Sigorta şirketi, otomotiv müşterisi, dealer, bayi |
| **Period** | Mutabakat dönemi | Ay bazlı (ör. 2026-04) |

## 3. Entity Listesi (Çekirdek Domain)

Clean Architecture bağlamında `Core` katmanına girecek entity'ler:

### 3.1 ReconciliationFlow (enum / config)

- `Insurance`
- `Automotive`
- Genişletilebilir (ör. ileride `Corporate`, `Dealer`)

### 3.2 ReconciliationBatch

Kaynak dosyadan yapılan tek import.

| Alan | Tip | Zorunlu | Not |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | Multi-tenant (Day-1) |
| `flow` | enum | ✓ | `Insurance` / `Automotive` |
| `period_code` | string(7) | ✓ | `YYYY-MM` |
| `source_type` | enum | ✓ | `InsurerList` / `TarsPowerBi` / `ManualCsv` |
| `source_file_name` | string | ✓ | Orijinal dosya adı |
| `source_file_hash` | string | ✓ | SHA-256, duplicate import engeli |
| `row_count` | int | ✓ | Toplam satır |
| `imported_by` | UUID | ✓ | User FK |
| `imported_at` | timestamptz | ✓ | |
| `status` | enum | ✓ | `Draft` / `Parsed` / `Mapped` / `Archived` |
| `notes` | text | | |

### 3.3 ReconciliationSourceRow

Ham veri. Değiştirilmez, audit kaynağı.

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `batch_id` | UUID | ✓ |
| `external_customer_ref` | string | ✓ |
| `external_document_ref` | string | |
| `raw_payload` | jsonb | ✓ |
| `row_number` | int | ✓ |
| `parsed_at` | timestamptz | ✓ |
| `parse_status` | enum | ✓ | `Ok` / `Warning` / `Error` |
| `parse_errors` | jsonb | | |

### 3.4 ReconciliationCase

Mutabakat dosyası. Bir müşteri + dönem + flow üçlüsü için tektir.

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `company_id` | UUID | ✓ |
| `flow` | enum | ✓ |
| `period_code` | string(7) | ✓ |
| `customer_id` | UUID | ✓ | İç müşteri FK |
| `contract_id` | UUID | | Hangi sözleşme kapsamında |
| `status` | enum | ✓ | Statü makinesi §4 |
| `owner_user_id` | UUID | ✓ | Sahibi (mutabakat ekibi üyesi) |
| `opened_at` | timestamptz | ✓ |
| `sent_to_customer_at` | timestamptz | | |
| `customer_response_at` | timestamptz | | |
| `sent_to_accounting_at` | timestamptz | | |
| `total_amount` | decimal(18,2) | ✓ | Line toplamı (computed) |
| `currency_code` | char(3) | ✓ | Default `TRY` |
| `notes` | text | | |

Benzersizlik: `(company_id, flow, period_code, customer_id)` — aynı müşteriye aynı dönemde iki case açılamaz.

### 3.5 ReconciliationLine

Case içindeki fatura kalemi.

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `case_id` | UUID | ✓ |
| `source_row_id` | UUID | ✓ | Hangi ham satırdan geldi |
| `product_code` | string | ✓ | Ürün/hizmet kodu |
| `product_name` | string | ✓ | Gösterim adı |
| `quantity` | decimal(18,4) | ✓ | Adet / kullanım |
| `unit_price` | decimal(18,4) | ✓ | Sözleşmeden gelen |
| `amount` | decimal(18,2) | ✓ | quantity × unit_price |
| `currency_code` | char(3) | ✓ | |
| `price_source_ref` | string | ✓ | Hangi sözleşme maddesi |
| `status` | enum | ✓ | `PendingReview` / `PricingMismatch` / `Ready` / `Disputed` / `Rejected` |
| `dispute_reason_code` | enum | | Sonlu liste (§7) |
| `dispute_note` | text | | |

### 3.6 ReconciliationDecision

Line üzerinde yapılan her aksiyon. Append-only.

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `line_id` | UUID | ✓ |
| `decision_type` | enum | ✓ | `Reviewed` / `SentToCustomer` / `CustomerApproved` / `CustomerDisputed` / `ReturnedForCorrection` / `ReadyForAccounting` |
| `actor_user_id` | UUID | ✓ |
| `actor_role` | enum | ✓ | `ReconAgent` / `Customer` / `System` |
| `decided_at` | timestamptz | ✓ |
| `note` | text | | |
| `evidence_file_ref` | string | | Müşteri onay mail PDF'i, vs. |

### 3.7 AccountingInstruction

Mutabakat kapanıp muhasebeye aktarılacak kayıt.

| Alan | Tip | Zorunlu |
|---|---|---|
| `id` | UUID | ✓ |
| `company_id` | UUID | ✓ |
| `case_id` | UUID | ✓ |
| `customer_id` | UUID | ✓ |
| `period_code` | string(7) | ✓ |
| `flow` | enum | ✓ |
| `lines_summary` | jsonb | ✓ | Ürün / adet / birim fiyat / toplam listesi |
| `total_amount` | decimal(18,2) | ✓ |
| `currency_code` | char(3) | ✓ |
| `status` | enum | ✓ | `Ready` / `Exported` / `AckFromAccounting` / `Rejected` |
| `exported_at` | timestamptz | | |
| `exported_format` | enum | | `ExcelPackage` / `Csv` / `ErpApiV1` |
| `external_ref` | string | | Muhasebenin verdiği referans |

### 3.8 Destek Tabloları (Referans)

- `Customer` — sistemde mevcut; `external_customer_ref` (Logo kodu) ile eşlenir
- `Contract` — sistemde mevcut; `PriceBook` ile bağlı
- `PriceBook` — sözleşme kapsamındaki ürün/hizmet ve birim fiyatları
- `RiskRuleSet` — grup bazlı eşikler (§8)

## 4. Statü Makinesi

### 4.1 Case Statüsü

```
             ┌────────┐
             │ Draft  │  (batch parse edildikten sonra açılır)
             └───┬────┘
                 │ assign owner
                 ▼
             ┌──────────────┐
             │ UnderControl │  (mutabakat ekibi kontrolde)
             └──┬──────┬────┘
                │      │ tüm line'lar ready değil
                │      └──────────┐
                │ tüm line Ready  │
                ▼                 │
          ┌─────────────────┐     │
          │ PricingMatched  │     │
          └────────┬────────┘     │
                   │ müşteriye gönder
                   ▼              │
           ┌─────────────────┐    │
           │ SentToCustomer  │    │
           └─┬───────┬──────┘     │
             │       │            │
   approved  │       │ disputed   │
             ▼       ▼            │
   ┌─────────────┐  ┌──────────────┐
   │ CustomerApp │  │ CustomerDisp │◄─┘
   └──────┬──────┘  └──────┬───────┘
          │                │ revize → UnderControl
          ▼                │
   ┌──────────────────┐    │
   │ ReadyForAccounting│   │
   └─────────┬────────┘    │
             │ export      │
             ▼             │
   ┌────────────────────┐  │
   │ SentToAccounting   │  │
   └────────────────────┘  │
```

Geçiş kuralları:
- `Draft → UnderControl` yalnızca case'e owner atanınca.
- `UnderControl → PricingMatched` yalnızca tüm line'lar `Ready` olunca.
- `CustomerDisputed → UnderControl` mutabakat ekibi revizyonla tekrar açınca.
- `SentToAccounting`'ten geri dönülmez (Faz 2'de fatura akışına geçer).

### 4.2 Line Statüsü

| Statü | Anlam | Geçişler |
|---|---|---|
| `PendingReview` | Yeni import edilmiş | → `PricingMismatch`, `Ready`, `Rejected` |
| `PricingMismatch` | Sözleşme fiyatı ile uyumsuz | → `Ready`, `Rejected` |
| `Ready` | Müşteriye gösterilmeye hazır | → `Disputed`, `Rejected` (müşteri cevabı ile) |
| `Disputed` | Müşteri itiraz etti | → `Ready` (revize sonrası), `Rejected` |
| `Rejected` | Kapanan ve faturalanmayacak | Terminal |

### 4.3 Batch Statüsü

| Statü | Anlam |
|---|---|
| `Draft` | Yüklendi, parse edilmedi |
| `Parsed` | Satırlar çıkarıldı |
| `Mapped` | Case'lere dağıtıldı |
| `Archived` | Tüm case'leri kapandı |

## 5. İş Akışı Algoritması (Mutabakat Ekibi)

### 5.1 Sigorta Akışı

```
1. Batch oluştur (flow=Insurance, period_code=YYYY-MM, source_type=InsurerList)
2. Dosya parse et → SourceRow'lar
3. Her SourceRow için:
   a. Müşteri eşlemesi yap (external_customer_ref → Customer.id)
   b. Müşteri bulunamazsa → ImportError (satır beklemede, öneri: yeni müşteri kaydı)
   c. Kontrat kapsamını bul (Contract + PriceBook)
   d. Poliçede dahil paket + fiyat eşleşmesi:
      - Paket sözleşmede varsa ve fiyat eşleşiyorsa → Line oluştur status=Ready
      - Paket var fakat fiyat farklı → Line status=PricingMismatch
      - Paket sözleşmede yoksa → Line status=Rejected + dispute_reason=PackageNotInContract
4. Aynı müşteri + period için Case oluştur/güncelle
5. Owner ata → Case UnderControl
6. Agent PricingMismatch'leri çözer:
   - Sözleşmeyi güncelle → Line Ready
   - Müşteriden veri iste → Line Disputed
7. Tüm line Ready → Case PricingMatched
8. Müşteri onayına gönder → Case SentToCustomer (Decision kaydı oluşur)
9. Müşteri cevabı:
   - Onay → Case CustomerApproved
   - İtiraz → Case CustomerDisputed (revize çemberine geri)
10. Approved sonrası → Case ReadyForAccounting
11. Export → AccountingInstruction.status=Exported; Case SentToAccounting
```

### 5.2 Otomotiv Akışı

Sigorta ile aynı iskelette, kritik farklar:

- `source_type = TarsPowerBi`
- `external_customer_ref` = dealer/bayi kodu
- Eşleme birimi: **hizmet kullanım adedi** (yol yardımı, ikame araç, çekici, vb.)
- Fiyat kaynağı: hizmet bedeli tablosu (sözleşmedeki)
- Olası ek statü: `UsageValidationPending` (kullanım adedi teyidi gereken kalemler) — MVP'de `PricingMismatch` çatısı altında tutulabilir; Faz 2'de ayrılır.

## 6. Import Şablonları

### 6.1 Sigorta Import Şablonu (Insurer List)

| Kolon | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `policy_no` | string | ✓ | Poliçe numarası |
| `insured_party_name` | string | ✓ | Sigortalı adı |
| `product_code` | string | ✓ | Asistans paketi kodu |
| `product_name` | string | ✓ | Paket gösterim adı |
| `quantity` | int | ✓ | Genelde 1 |
| `unit_price_expected` | decimal | | Şirketin beyan ettiği fiyat (kontrol için) |
| `period_code` | string(7) | ✓ | `YYYY-MM` |
| `external_customer_ref` | string | ✓ | Sigorta şirketi Logo kodu |
| `notes` | string | | |

- Kabul edilen format: `.xlsx`, `.csv` (UTF-8, Türkçe karakter desteği)
- Maksimum satır: 20.000 (MVP sınırı)
- Parse sırasında: başlık eşleme toleransı (büyük-küçük harf, Türkçe karakter normalizasyon)

### 6.2 Otomotiv Import Şablonu (TARS / Power BI)

| Kolon | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `case_ref` | string | ✓ | TARS operasyon dosya no |
| `service_code` | string | ✓ | Hizmet kodu (çekici, yol yardımı, vb.) |
| `service_name` | string | ✓ | Gösterim adı |
| `usage_count` | int | ✓ | Adet |
| `service_date` | date | ✓ | Hizmetin verildiği tarih |
| `dealer_code` | string | ✓ | Bayi / şirket kodu |
| `period_code` | string(7) | ✓ | |
| `external_customer_ref` | string | ✓ | |
| `power_bi_query_ref` | string | | Kaynak Power BI query kimliği |

### 6.3 Parser Kuralları (Her İki Şablon)

- Başlık satırı zorunlu; 1 satır tolerans (2. satırdan başlayabilir)
- Tarih formatı: ISO-8601 + TR (`DD.MM.YYYY`)
- Sayı formatı: TR (binlik `.`, ondalık `,`) ve EN (binlik `,`, ondalık `.`) kabul
- Boş satır atlanır
- Error satırları `SourceRow.parse_status=Error` ile kaydedilir; batch reddedilmez
- `source_file_hash` aynı batch'i engeller (duplicate import koruması)

## 7. Dispute Sebep Kodları

Müşteri itirazı veya line reddi için sonlu liste. UI sadece bu listeden seçtirir:

| Kod | Anlam | Hangi flow |
|---|---|---|
| `PRICE_MISMATCH` | Sözleşme fiyatı ile uyumsuz | Her ikisi |
| `QTY_MISMATCH` | Adet uyuşmuyor | Her ikisi |
| `PKG_NOT_IN_CONTRACT` | Paket/hizmet sözleşmede yok | Sigorta |
| `SERVICE_NOT_RENDERED` | Hizmet verilmemiş | Otomotiv |
| `DUPLICATE` | Daha önce faturalandı | Her ikisi |
| `POLICY_CANCELLED` | Poliçe iptal | Sigorta |
| `PERIOD_MISMATCH` | Dönem dışı kalem | Her ikisi |
| `OTHER` | Diğer (serbest metin zorunlu) | Her ikisi |

## 8. Risk Kuralı Konfigürasyonu (Parametre)

Excel analizinde gözlemlendiği üzere Otomotiv ve Sigorta'nın **gecikme risk eşikleri farklı** (Otomotiv ORTA=10 gün, Sigorta ORTA=30 gün). Bu, **kod değil konfigürasyon** olmalı.

`RiskRuleSet` entity'si:

| Alan | Tip | Örnek |
|---|---|---|
| `id` | UUID | |
| `flow` | enum | `Automotive` |
| `low_to_medium_days` | int | `10` |
| `medium_to_high_days` | int | `90` |
| `effective_from` | date | `2026-01-01` |
| `effective_to` | date | `null` (açık) |
| `updated_by` | UUID | |
| `updated_at` | timestamptz | |

Hesaplanacak alanlar kod değil formül olmalı:
```
if overdue_amount == 0:
    risk = LOW
elif max_overdue_days >= rule.medium_to_high_days:
    risk = HIGH
elif max_overdue_days >= rule.low_to_medium_days:
    risk = MEDIUM
else:
    risk = LOW
```

Faz 1'de risk yalnızca raporlama için, statüyü etkilemez. Faz 3'te tahsilat dashboard'ında kullanılır.

## 9. Muhasebeye Aktarım Sözleşmesi (v1)

MVP'de aktarım **dosya tabanlı**. Faz 3'te direkt ERP API eklenebilir.

### 9.1 Excel Export Formatı

Tek sheet, başlık satırı + satırlar:

| Kolon | Tip |
|---|---|
| `instruction_id` | string (UUID) |
| `case_id` | string |
| `company_code` | string |
| `customer_code` | string (Logo kodu) |
| `customer_name` | string |
| `flow` | string |
| `period_code` | string |
| `contract_code` | string |
| `product_code` | string |
| `product_name` | string |
| `quantity` | decimal |
| `unit_price` | decimal |
| `amount` | decimal |
| `currency_code` | string |
| `exported_at_iso` | string |
| `exported_by` | string |

### 9.2 Ack Dönüşü (MVP: manuel)

Muhasebe fatura kestiğinde `AccountingInstruction.status = AckFromAccounting` olur. MVP'de elle işaretlenir (Faz 2'de ERP sync worker'ı).

## 10. API Yüzeyi (v1)

Faz 1 için minimum endpoint seti. REST, JSON. Auth: Entra ID (mevcut). Multi-tenant: `X-Tenant-Id` veya JWT claim.

### 10.1 Batch

- `POST /api/v1/reconciliation/batches` — yeni batch + dosya upload
- `GET  /api/v1/reconciliation/batches?flow=&period_code=` — liste
- `GET  /api/v1/reconciliation/batches/{id}` — detay
- `POST /api/v1/reconciliation/batches/{id}/parse` — parse tetikleme
- `DELETE /api/v1/reconciliation/batches/{id}` — sadece `Draft` statüde

### 10.2 Case

- `GET  /api/v1/reconciliation/cases?flow=&period_code=&status=&customer_id=`
- `GET  /api/v1/reconciliation/cases/{id}`
- `POST /api/v1/reconciliation/cases/{id}/assign-owner` body: `{userId}`
- `POST /api/v1/reconciliation/cases/{id}/send-to-customer`
- `POST /api/v1/reconciliation/cases/{id}/customer-response` body: `{result: approved|disputed, evidenceFileRef?, note?}`
- `POST /api/v1/reconciliation/cases/{id}/ready-for-accounting`
- `POST /api/v1/reconciliation/cases/{id}/export` body: `{format: excel|csv}`

### 10.3 Line

- `PATCH /api/v1/reconciliation/lines/{id}` body: `{unitPrice?, quantity?, status?, note?}`
- `POST  /api/v1/reconciliation/lines/{id}/dispute` body: `{reasonCode, note}`
- `POST  /api/v1/reconciliation/lines/{id}/ready`

### 10.4 Accounting Instruction

- `GET  /api/v1/accounting/instructions?status=&period_code=`
- `POST /api/v1/accounting/instructions/{id}/ack` body: `{externalRef}`

### 10.5 Configuration

- `GET  /api/v1/config/risk-rules`
- `PUT  /api/v1/config/risk-rules/{flow}` body: `{lowToMediumDays, mediumToHighDays, effectiveFrom}`

## 11. Yetkilendirme (RBAC)

Mevcut projedeki rollere entegre olarak:

| Aksiyon | Rol |
|---|---|
| Batch oluştur / parse | `ReconAgent`, `FinanceManager`, `Admin` |
| Case sahipliği üstlen | `ReconAgent` |
| Line düzenleme | `ReconAgent` |
| Müşteriye gönder | `ReconAgent`, `FinanceManager` |
| Muhasebeye aktar | `FinanceManager`, `Admin` |
| Risk kuralı değiştir | `Admin`, `Cfo` |
| Raporları görüntüle | Tüm roller (read-only) |

Her case satırının `company_id` ile tenant izolasyonu zorunludur (mevcut RLS kurallarına eklenir).

## 12. Audit İzi

Day-1 audit prensibi geçerli:
- Her statü değişikliği `audit_log` tablosuna yazılır
- `ReconciliationDecision` zaten append-only — iş katmanında ek kayıt
- `AccountingInstruction.exported_at` + `exported_by` zorunlu
- Dosya export'larının hash'i saklanır (retansiyon 7 yıl)

## 13. Veri Migrasyonu (İlk Sürüm)

- Mevcut Excel dosyaları içe aktarılmaz; tarihsel veri değil.
- Başlangıç: 2026-04 döneminden itibaren sisteme taşınır.
- Sözleşme fiyat verileri önceden `PriceBook` tablosuna seed edilmeli (ayrı bir spec — Faz 1 önkoşulu).

## 14. Kabul Kriterleri

Faz 1 bitti demek için:

1. Sigorta batch import → case oluşturma → line üretimi → müşteri onayı → muhasebe export **uçtan uca** Excel ile test edilebiliyor
2. Otomotiv batch import için aynı akış çalışıyor
3. Risk kuralı yönetim ekranından flow bazlı değiştirilebiliyor
4. Aynı müşteri + dönem + flow için ikinci case açma **engelleniyor** (unique constraint)
5. Muhasebe export dosyası Logo formatıyla uyumlu (pilot muhasebe kullanıcısı onayladı)
6. Audit log'da statü değişiklikleri görülebiliyor
7. Integration test coverage ≥ %80 (case akışı, import parser, export üretimi)
8. Multi-tenant testte iki şirket birbirinin case'ini göremiyor (RLS doğrulaması)

## 15. Açık Sorular (Faz 1'de Karar Gerekli)

- **Müşteri onay mekanizması:** E-posta PDF mi, sisteme davet linki mi? MVP'de e-posta önerilir, Faz 2'de portal.
- **İtiraz yönetimi derinliği:** Satır bazlı mı, case bazlı mı? MVP'de her iki seviye de destekleniyor (öneri) ama UI yalnızca satır seviyesi gösteriyor.
- **Kısmi mutabakat:** Case içinde bir kısım line onaylandı, bir kısmı itirazlı. MVP'de tüm case aynı statüde olmalı; kısmi akış Faz 2.
- **Para birimi:** MVP TRY. EUR/USD line düzeyinde desteklenmeli mi? (Öneri: veri modelinde var, UI'da yalnızca TRY.)
- **Dosya boyutu limiti:** 20.000 satır yeterli mi? Power BI export'ları genişleyebilir. (Öneri: konfigürasyon, varsayılan 20K, admin yükseltebilir.)
- **Çoklu dönem:** Bir batch birden fazla dönemi karıştırabilir mi? (Öneri: hayır, tek `period_code` kuralı.)

## 16. Faz 1 Teslim Listesi

- [ ] 8 entity + migration'lar (`ReconciliationBatch`, `…SourceRow`, `…Case`, `…Line`, `…Decision`, `AccountingInstruction`, `RiskRuleSet`, `…Flow` enum)
- [ ] Import parser (xlsx + csv) + başlık mapping toleransı
- [ ] Case state machine + unit test
- [ ] 17 REST endpoint + OpenAPI
- [ ] Excel export generator (ClosedXML)
- [ ] 4 MVP ekranı: Batch listesi, Case listesi, Case detay, Muhasebeye Aktarım
- [ ] RBAC policy + multi-tenant RLS eklemeleri
- [ ] Integration testleri (akış bazlı)
- [ ] Audit log entegrasyonu
- [ ] Kullanıcı dokümantasyonu (Reconciliation Agent kullanım kılavuzu)

Toplam tahmin: **6-8 hafta, 1 backend + 1 frontend + 0.5 QA FTE**.
