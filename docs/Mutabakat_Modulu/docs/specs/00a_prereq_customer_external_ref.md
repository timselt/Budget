# Önkoşul Spec #1 — Customer.external_customer_ref

- **Tarih:** 2026-04-19
- **Durum:** Hazır, uygulanmayı bekliyor
- **Bağlı olduğu:** [`01_phase1_domain_model.md`](./01_phase1_domain_model.md) §3.4 (ReconciliationCase.customer_id)
- **Amaç:** Mutabakat modülünün iç müşteri ile Logo müşteri kodunu kilitli şekilde eşleyebilmesi için `Customer` entity'sine dış kimlik alanı eklemek.

## 1. Neden Gerekli?

Mevcut Excel analizi açıkça gösterdi: müşteri **tam ünvanı** kaynaktan kaynağa değişiyor (örn. "MAPFRE SİGORTA ANONİM ŞİRKETİ" vs "MAPFRE SİGORTA A.Ş."). Birleştirme anahtarı olarak ad kullanmak sürdürülebilir değil. Sistem genelinde birincil eşleşme **Logo müşteri kodu** üzerinden olmalı.

Bu alan ayrıca Faz 2'de **IssuedInvoice** eşleştirmesi ve Faz 3'te **CollectionTransaction** allocation'ı için de zorunlu.

## 2. Kapsam

### 2.1 Veri Modeli Değişikliği

`Customer` entity'sine aşağıdaki alanlar eklenir:

| Alan | Tip | Zorunlu | Index | Not |
|---|---|---|---|---|
| `external_customer_ref` | varchar(32) | ✓ | Unique per company | Logo müşteri kodu (`1500xxxxxx` formatı) |
| `external_source_system` | varchar(16) | ✓ | — | `LOGO` / `MIKRO` / `MANUAL` — gelecek için esnek |
| `external_ref_verified_at` | timestamptz | — | — | Son doğrulama zamanı |
| `external_ref_verified_by` | UUID | — | — | Doğrulayan user |

### 2.2 Index ve Kısıtlar

```sql
-- Multi-tenant bağlamda aynı Logo kodu farklı tenant'larda olabilir,
-- ama aynı tenant içinde tekildir.
CREATE UNIQUE INDEX ix_customer_external_ref
  ON customers (company_id, external_customer_ref)
  WHERE external_customer_ref IS NOT NULL;

-- Arama performansı için
CREATE INDEX ix_customer_external_ref_lookup
  ON customers (company_id, external_source_system, external_customer_ref);
```

### 2.3 RLS

Mevcut `budget_app` role'ü için RLS politikası değişmez; alan `company_id` üzerinden zaten izole.

### 2.4 Migration Stratejisi

Mevcut müşteri verisi için:

1. **Migration-up:** Alanları `nullable` olarak ekle.
2. **Data backfill script:** Ayrı bir seed script'i. Manuel eşleme için CSV yükleme desteği:
   ```
   customer_id, external_customer_ref, external_source_system
   ```
3. **Follow-up migration:** Tüm müşteriler eşlendikten sonra `NOT NULL` kısıtı zorla (Faz 1 sonunda, UAT öncesi).
4. **Migration-down:** Alanları drop; backfill verisi kaybolur (dokümante edilmiş).

### 2.5 API Değişiklikleri

`CustomerDto` — yeni alanlar eklenir:
```json
{
  "id": "uuid",
  "displayName": "...",
  "legalName": "...",
  "externalCustomerRef": "1500003063",
  "externalSourceSystem": "LOGO",
  "externalRefVerifiedAt": "2026-04-19T..."
}
```

Yeni endpoint:
- `POST /api/v1/customers/{id}/link-external` body: `{externalRef, sourceSystem}` — ReconAgent veya Admin çağırır.
- `GET /api/v1/customers/lookup?externalRef=1500003063` — import parser'ın eşleme için kullandığı endpoint.

## 3. UI Değişiklikleri

- **Customer Edit** sayfasına "Dış Sistem Kodu" bölümü eklenir.
- Kod girilip kaydedildiğinde `external_ref_verified_at` güncellenir.
- Mutabakat import akışında bilinmeyen kod bulunursa otomatik "bu müşteriye eşleme yap" modal'ı (link-external endpoint'ini çağırır).

## 4. Test Kriterleri

- Migration çalıştıktan sonra mevcut müşterilerin hiçbirinde veri kaybı olmamalı.
- `UNIQUE` kısıtı aynı tenant'ta iki müşteriye aynı `external_customer_ref`'i atayamaz.
- Farklı tenant'larda aynı Logo kodu olabilir.
- `GET /customers/lookup` bilinmeyen kod için 404 döner (200 + null değil).
- Backfill script'inde `customer_id` yanlışsa transaction rollback olur.

## 5. Tahmini Efor

| İş | Efor |
|---|---|
| Migration + entity güncellemesi | 0.5 gün |
| Lookup endpoint + backfill script | 1 gün |
| UI entegrasyonu | 0.5 gün |
| Test + QA | 0.5 gün |
| **Toplam** | **2.5 gün** |

## 6. Kabul Kriterleri

- [ ] `Customer` entity'sinde 4 yeni alan mevcut
- [ ] Unique index + lookup index oluştu
- [ ] `link-external` + `lookup` endpoint'leri çalışıyor
- [ ] CustomerDto yeni alanları içeriyor
- [ ] UI'da dış kod girişi mümkün
- [ ] Integration test + unit test (%80+)
- [ ] Audit log: `CustomerExternalRefLinked` event tipi tanımlandı
- [ ] Backfill script dokümante edildi

## 7. Uygulama Notu

Bu spec Claude Code'a verilirken prompt şu şekilde olmalı:

```
Referans: Mutabakat_Modulu/docs/specs/00a_prereq_customer_external_ref.md

Görev: Customer entity'sine external_customer_ref alanını eklemek.

Kurallar:
1. EF Core migration down-script'i çalışır olmalı.
2. Unique index'i WHERE NOT NULL ile kısıtla (mevcut müşteriler null kalabilir).
3. Unit test: duplicate external_ref aynı tenant'ta reddediliyor, farklı tenant'ta kabul ediliyor.
4. Integration test: /customers/lookup endpoint'i.
5. Audit event: CustomerExternalRefLinked.
6. KVKK: external_customer_ref PII değil, maskelemeye gerek yok.

Mini-plan sun, onayımı bekle.
```
