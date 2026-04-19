# Mutabakat Parser — Fixture & Alias Listesi

> **Tarih:** 2026-04-19  
> **Sprint:** 1 (Madde 2-3)  
> **Spec:** [`docs/Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md`](../Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md) §6  

Bu dosya parser'ın tanıdığı kolon adı varyasyonlarını ve test fixture stratejisini belgelendirir. Mutabakat ekibi yeni sigorta şirketi / TARS export varyasyonu eklediğinde bu liste güncellenir; production'a deploy öncesi `ReconciliationTemplates.cs` ve test fixture'ları aynı PR'da güncellenmelidir.

---

## 1. Kolon Alias Listesi

Resolver normalizasyonu (`ColumnMappingResolver.Normalize`):
1. Türkçe karakter dönüşümü: `İ→I, ı→i, Ş→S, ş→s, Ğ→G, ğ→g, Ü→U, ü→u, Ö→O, ö→o, Ç→C, ç→c`
2. Unicode FormD + diakritik mark silme (kalıntı)
3. Lowercase (invariant culture)
4. Ayırıcı silme: boşluk, alt çizgi (`_`), tire (`-`), nokta (`.`), tab

Normalize sonucu aynı olan tüm varyasyonlar canonical kolona eşlenir.

### 1.1 Sigorta Şablonu (`ReconciliationFlow.Insurance`)

| Canonical | Tanınan varyasyonlar |
|---|---|
| `policy_no` | `policy_no`, `police_no`, `poliçe_no`, `policy number`, `poliçe numarası` |
| `insured_party_name` | `insured_party_name`, `insured_name`, `sigortali_adi`, `sigortalı adı`, `sigortalı` |
| `product_code` | `product_code`, `urun_kodu`, `ürün kodu`, `paket_kodu`, `asistans_kodu` |
| `product_name` | `product_name`, `urun_adi`, `ürün adı`, `paket_adi`, `asistans_adi` |
| `quantity` | `quantity`, `qty`, `adet`, `miktar` |
| `unit_price_expected` | `unit_price_expected`, `expected_price`, `beklenen_fiyat`, `birim_fiyat` |
| `period_code` | `period_code`, `donem`, `dönem`, `period` |
| `external_customer_ref` | `external_customer_ref`, `logo_kodu`, `musteri_kodu`, `müşteri kodu`, `musteri_ref` |
| `notes` | `notes`, `notlar`, `aciklama`, `açıklama` |

### 1.2 Otomotiv Şablonu (`ReconciliationFlow.Automotive`)

| Canonical | Tanınan varyasyonlar |
|---|---|
| `case_ref` | `case_ref`, `tars_no`, `operation_no`, `operasyon_no`, `dosya_no` |
| `service_code` | `service_code`, `hizmet_kodu`, `hizmet kodu`, `service_id` |
| `service_name` | `service_name`, `hizmet_adi`, `hizmet adı`, `service_description` |
| `usage_count` | `usage_count`, `adet`, `kullanim_adedi`, `kullanım adedi`, `qty` |
| `service_date` | `service_date`, `hizmet_tarihi`, `hizmet tarihi`, `tarih`, `date` |
| `dealer_code` | `dealer_code`, `bayi_kodu`, `bayi kodu`, `sirket_kodu`, `şirket kodu` |
| `period_code` | `period_code`, `donem`, `dönem`, `period` |
| `external_customer_ref` | `external_customer_ref`, `musteri_kodu`, `müşteri kodu`, `logo_kodu`, `musteri_ref` |
| `power_bi_query_ref` | `power_bi_query_ref`, `powerbi_query`, `query_ref`, `query_id` |

> **Yeni varyasyon ekleme:** `src/BudgetTracker.Application/Reconciliation/Import/ReconciliationTemplates.cs` içindeki ilgili template'in `Aliases` listesine ekleyin. Mutabakat ekibinden gerçek bir CSV/xlsx örneği ile birlikte unit test fixture'ı (`tests/.../Reconciliation/Import/Fixtures/`) ekleyin.

---

## 2. Sayı Format Toleransı (`NumberFormatDetector`)

Tek decimal parser hem TR hem EN locale'i tolere eder. Test edilmiş senaryolar:

| Input | Çıktı | Not |
|---|---|---|
| `1234.56` | 1234.56 | EN ondalık |
| `1234,56` | 1234.56 | TR ondalık |
| `1.234,56` | 1234.56 | TR binlik + ondalık |
| `1,234.56` | 1234.56 | EN binlik + ondalık |
| `1234` | 1234 | Saf tamsayı |
| `(123,45)` | -123.45 | Accounting negatif (parantez) |
| `-1.234,50` | -1234.50 | TR negatif (eksi) |
| `₺ 1.234,50` | 1234.50 | Para birimi prefix temizliği |
| `1.234,50 TL` | 1234.50 | Para birimi suffix temizliği |
| `1.234` | 1234 | Ambigous → binlik konvansiyonu (warning candidate) |

**Bilinen ambiguity:** Tek nokta + 3 hane (`1.234`) durumunda detector binlik varsayar. Gerçek veri `1.234` (= 1234) veya `1.234` (= 1.234 onda) olabilir; mutabakat ekibinin kullanıcısı genelde TR locale'inde 3 haneli grup binlik için kullanır. Bu varsayım doğru olduğu sürece gerçek finansal hatalar oluşmaz; bu varsayımdan şüphe ederseniz CSV'yi düzeltin (binlik kaldırın, ondalık virgül kullanın).

---

## 3. Tarih Format Toleransı (`DateFormatDetector`)

Sıralı format dene-yakala (ilk eşleşen kazanır):

1. ISO-8601: `yyyy-MM-dd`, `yyyy-MM-ddTHH:mm:ss`, `yyyy-MM-ddTHH:mm:ssK`, `yyyy-MM-dd HH:mm:ss`
2. TR standart: `dd.MM.yyyy`, `dd.MM.yyyy HH:mm:ss`, `d.M.yyyy`
3. TR varyantlar: `dd/MM/yyyy`, `dd-MM-yyyy`
4. EN US: `MM/dd/yyyy`, `M/d/yyyy`
5. Fallback: invariant culture relaxed parse

**Ambiguity uyarısı:** `01/02/2026` formatı TR'de 1 Şubat, EN'de 2 Ocak demek. TR formatları sıralamada önce — TR yorumu kazanır. ABD-kaynaklı CSV'lerde ISO-8601'e dönüştürülmesi önerilir.

`period_code` (YYYY-MM) ayrı validator (`IsValidPeriodCode`) — yıl 2000-2100, ay 1-12 sınırlı.

---

## 4. Test Fixture Stratejisi

`tests/BudgetTracker.UnitTests/Reconciliation/Import/Fixtures/` (Madde 6'da eklenecek) içinde:

- **`insurance_minimal.csv`** — 9 zorunlu kolon, 3 satır, hepsi Ok
- **`insurance_with_aliases.xlsx`** — Türkçe başlıklar (`Müşteri Kodu`, `Poliçe No`), TR sayı formatı
- **`insurance_with_errors.csv`** — 5 satırın 2'si zorunlu kolon eksik; batch düşmemeli
- **`automotive_minimal.csv`** — 9 zorunlu kolon, 3 satır
- **`automotive_tars_export.xlsx`** — gerçek TARS export şablonuna yakın
- **`mixed_locale_decimals.csv`** — TR/EN sayı formatlarının karışımı
- **`empty_first_row.xlsx`** — başlık 2. satırda (boş 1. satır toleransı)
- **`duplicate_columns.csv`** — aynı canonical'e map'lenen 2 başlık (resolver hata fırlatır)
- **`bom_utf8.csv`** — BOM'lu UTF-8 (transparent okunmalı)

Pilot seed (Sprint 2 öncesi, `Mutabakat_Modulu/seed/`) gerçek operasyonel veriden türetilmiş anonimleştirilmiş örnekler içerecek. Sprint 1 fixture'ları parser pipeline'ını kapsar; integration test'leri pilot seed üzerinden (`tests/.../IntegrationTests/Reconciliation/Import/`) Sprint 2'de zenginleştirilecek.

---

## 5. Bilinen Sınırlar (Sprint 1 MVP)

- **Multi-sheet xlsx**: sadece ilk worksheet okunur (uyarı yok). Spec §6.3'te ek toleransa gerek görülmemiş; multi-sheet senaryosu Sprint 3'te (gerekirse).
- **Maksimum satır**: `MaxRowsPerBatch = 20.000` (spec §6.1). Fazlası sessizce kesilir, `ParsedBatchResult.Truncated = true`. UI Madde 4'te bu flag'i banner ile gösterecek.
- **Encoding**: CSV için sadece UTF-8 (BOM transparent). Windows-1254/ANSI desteği şu an yok — mutabakat ekibinden tüm CSV'lerin UTF-8 export edilmesi istenir. Sprint 2'de (gerekirse) detector eklenebilir.
- **Cell formula**: Xlsx hücrelerinde formula varsa ClosedXML değerlendirilmiş sonucu döndürür. Cached değer eski olabilirse (örn. dosya formula'lar manuel yenilenmeden gönderildiyse) yanlış değer okunabilir; tipik mutabakat dosyalarında formula yok.

---

## 6. Değişiklik Geçmişi

| Tarih | Sürüm | Değişiklik |
|---|---|---|
| 2026-04-19 | Sprint 1 v1 | İlk doküman. Sigorta + Otomotiv template'leri, sayı/tarih detector özet. |
