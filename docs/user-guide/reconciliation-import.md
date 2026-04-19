# Mutabakat Batch Import — Kullanıcı Kılavuzu

> **Hedef kitle:** Mutabakat ekibi (ReconAgent rolü) + Finans Yöneticisi  
> **Sprint:** 1 (MVP)  
> **Ekran:** `/mutabakat/batches` (Sol menü → Mutabakat → Batch Listesi)  

Bu doküman yeni mutabakat dosyası yükleme (sigorta poliçe listesi + otomotiv TARS/Power BI export) sürecini adım adım anlatır.

---

## 1. Ne Zaman Kullanılır

Her ay başında (örn. 1 Mayıs için `2026-05`) önceki ay tüketim verileri geldikten sonra:

- **Sigorta akışı:** Sigorta şirketinden gelen **poliçe listesi** (Excel/CSV). Tipik adlar: `Anadolu_2026_04.xlsx`, `AxaSigorta_Nisan2026.csv`.
- **Otomotiv akışı:** TARS raporundan veya Power BI export'undan **hizmet kullanım listesi** (Excel/CSV). Tipik ad: `TARS_export_2026_04.xlsx`.

Yüklenen dosya kaynak belge olarak saklanmaz; içindeki satırlar `ReconciliationSourceRow` olarak parse edilir ve ham JSON payload olarak veritabanına yazılır. Dosya içeriği SHA-256 ile hash'lenir — aynı dosya iki kez yüklenemez.

---

## 2. Dosya Şablonları

Parser aşağıdaki kolon adı varyasyonlarını otomatik tanır. Türkçe karakter (`İ`, `ş`, `ğ` vb.) ve büyük-küçük harf farkları tolere edilir; alt çizgi, boşluk, tire ayırıcıları tanınır.

**Tam kolon listesi ve varyasyonları:** [`docs/reconciliation/parser-fixtures.md`](../reconciliation/parser-fixtures.md)

### 2.1 Sigorta Şablonu (9 kolon)

| Kolon | Zorunlu | Örnek |
|---|---|---|
| `policy_no` | ✓ | POL-20260400123 |
| `insured_party_name` | ✓ | Ali Ahmet Veli |
| `product_code` | ✓ | KSK-STD |
| `product_name` | ✓ | Kasko Standart |
| `quantity` | ✓ | 1 |
| `unit_price_expected` | | 1250,50 |
| `period_code` | ✓ | 2026-04 |
| `external_customer_ref` | ✓ | LOGO-100 |
| `notes` | | — |

### 2.2 Otomotiv Şablonu (9 kolon)

| Kolon | Zorunlu | Örnek |
|---|---|---|
| `case_ref` | ✓ | TARS-2026-04-00123 |
| `service_code` | ✓ | YYL-01 |
| `service_name` | ✓ | Yol Yardım |
| `usage_count` | ✓ | 1 |
| `service_date` | ✓ | 15.04.2026 |
| `dealer_code` | ✓ | BAYI-50 |
| `period_code` | ✓ | 2026-04 |
| `external_customer_ref` | ✓ | OEM-XYZ |
| `power_bi_query_ref` | | — |

---

## 3. Yükleme Adımları

1. **Sol menüden** "Mutabakat" section'ını aç → "Batch Listesi" tıkla.
2. Sağ üstte **"Yeni Batch Yükle"** butonu.
3. Modal'da sırasıyla:
   - **Akış Türü**: Sigorta veya Otomotiv
   - **Kaynak Tipi**: Insurer List (sigorta şirketi listesi) / TARS Power BI (otomotiv export) / Manuel CSV (serbest format)
   - **Dönem**: `YYYY-MM` (örn. `2026-04`)
   - **Dosya**: `.xlsx` veya `.csv`, **maks 25 MB, 20.000 satır**
   - **Notlar** (opsiyonel): Örn. "Anadolu Sigorta Nisan 2026 poliçe listesi (revize)"
4. **"Yükle ve Ayrıştır"** — parser çalışır, sonuç toast'ta görünür:  
   `Batch yüklendi: 1247 satır ayrıştırıldı (1240 OK, 5 uyarı, 2 hata)`
5. Liste sayfası otomatik yenilenir; yeni batch en üstte `Ayrıştırıldı` (Parsed) statüsünde.

---

## 4. Parse Sonucu Anlamak

### 4.1 Status Değerleri

| Satır | Anlam | Aksiyon |
|---|---|---|
| **OK** | Tüm zorunlu alan dolu, format geçerli | Sprint 2'de case'e dağıtılır |
| **Warning** | Opsiyonel alan hatalı ama satır kabul edildi | Agent UI'da incelenir (Sprint 2) |
| **Error** | Zorunlu alan eksik veya tipi geçersiz | Satır `Error` ile saklı; batch düşmez |

**Önemli:** Hatalı satırlar batch'i reddetmez. Dosyanın %98'i doğruysa o satırlar yüklenir, kalan %2'yi agent UI'dan düzeltilir (Sprint 2).

### 4.2 Status Akışı

```
Draft → (parser tamam) → Parsed → (Sprint 2) Mapped → (Sprint 4) Archived
```

Sprint 1'de import atomic — modal `Yükle ve Ayrıştır` tek işlemde Draft + Parsed'a geçer.

---

## 5. Sık Karşılaşılan Durumlar

### 5.1 "Bu dosya daha önce yüklenmiş" (409 Conflict)

Aynı içerikli dosya 2. kez yüklenmek istendiğinde görünür. SHA-256 hash aynı → sistem mevcut batch #`X` referansı verir.

**Çözüm:** Aynı dosyayı tekrar yüklemek istemiyorsanız hata görmezden gelin. Dosya içeriği farklıysa (revize edilmişse) — dosyanın son satırına boşluk ekleyerek hash'i değiştirebilirsiniz, ama **iki kez faturalama riski** vardır; önce mevcut batch'i inceleyin.

### 5.2 "Dosya okunamadı" (422 Unprocessable)

Dosya bozuk, şifre korumalı veya desteklenmeyen format.

**Çözüm:** Excel'de dosyayı tekrar aç → "Farklı Kaydet" → `.xlsx` (şifresiz) veya `.csv` (UTF-8). Yeniden yükle.

### 5.3 Dosya 20.000 satırı geçiyor

Parser ek satırları sessizce keser. UI banner'da uyarı gösterir (Sprint 1'de truncation flag; Sprint 2'de daha belirgin).

**Çözüm:** Dosyayı 2 parçaya bölüp iki batch olarak yükleyin (örn. A-K segmenti, L-Z segmenti).

### 5.4 Kolon adları farklı şirketten

Mutabakat ekibi yeni bir sigorta şirketi CSV şablonuyla karşılaşırsa, ilk yüklemede zorunlu alanlar eksik görünebilir. Geliştiriciden [`parser-fixtures.md`](../reconciliation/parser-fixtures.md) §1'e yeni alias ekletip gerçek CSV fixture'ı paylaşın.

---

## 6. Yetki Modeli

| Aksiyon | Policy | Kimler yapabilir? |
|---|---|---|
| Batch yükle | `Reconciliation.Import` | Admin, Finance Manager, ReconAgent |
| Liste gör | `Reconciliation.ViewReports` | Tüm kimliği doğrulanmış kullanıcılar |
| Detay gör | `Reconciliation.ViewReports` | Tüm kimliği doğrulanmış kullanıcılar |
| Draft sil | `Reconciliation.Manage` | Admin, Finance Manager, ReconAgent |

Multi-tenant: her batch sadece yüklendiği şirket içinden görünür (RLS + `company_id` filtre).

---

## 7. KVKK ve İzleme

- **Kaynak dosya saklanmaz** — sadece SHA-256 hash + satır JSON'ları.
- **Retention 7 yıl** (audit kaydı + SourceRow'lar); audit tablo partition'lanmış (aylık).
- Her yükleme `audit_log` tablosuna yazılır: kullanıcı, zaman, IP, şirket, dosya adı, hash, satır sayısı.
- Kişisel veriler (sigortalı adı, poliçe no) sistem içinde sadece mutabakat ekibi tarafından görülür; dış paylaşım Sprint 3'te müşteri onay akışıyla + şifreli PDF ile sağlanır.

---

## 8. Sprint 2'de Gelecek

Sprint 1 MVP — satır ayrıştırma + liste. Sprint 2'de eklenecek:

- **Case otomatik oluşturma**: parse edilmiş satırlar (müşteri × dönem) bazında case'lere dağıtılır
- **PriceBook lookup**: sözleşmeden birim fiyat otomatik gelir; uyumsuzluk → `PricingMismatch`
- **Agent UI — case detay**: line ekran, status machine (`PendingReview` → `Ready` vb.)
- **Reparse endpoint**: Sprint 1'de 501; Sprint 2'de aktif (template alias listesi güncellendiğinde)
