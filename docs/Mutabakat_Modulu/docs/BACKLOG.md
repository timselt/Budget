# Ürün Backlog — Mutabakat, Faturalama ve Tahsilat Yönetimi

- **Tarih:** 2026-04-19
- **Durum:** Taslak backlog
- **İlişkili:** [`RECONCILIATION_BILLING_COLLECTIONS.md`](./RECONCILIATION_BILLING_COLLECTIONS.md) · [`plans/2026-04-19-reconciliation-billing-collections-plan.md`](./plans/2026-04-19-reconciliation-billing-collections-plan.md) · [`specs/01_phase1_domain_model.md`](./specs/01_phase1_domain_model.md)

Bu backlog modülün tamamını üç faza bölünmüş şekilde ekran, entity ve epik düzeyinde kapsar. Hedef: geliştirme ekibinin sprint planlamada doğrudan kullanabileceği kırılımı vermek.

---

## 1. Modül Haritası

```
Mutabakat, Faturalama ve Tahsilat Yönetimi
├── A. Mutabakat Yönetimi (Faz 1)
│   ├── Sigorta akışı
│   └── Otomotiv akışı
├── B. Faturalama Takibi (Faz 2)
├── C. Tahsilat Yönetimi (Faz 3)
└── D. Yönetim Raporları (Faz 3)
```

Ortak altyapı (auth, multi-tenant, audit, i18n) mevcut bütçe sisteminden devralınır.

---

## 2. Epik Listesi

### Faz 1 — Mutabakat Yönetimi MVP

| Epik | Açıklama | Öncelik |
|---|---|---|
| E1.1 | Import & Parser | P0 |
| E1.2 | Case & Line Yönetimi | P0 |
| E1.3 | Fiyat Eşleştirme (PriceBook entegrasyonu) | P0 |
| E1.4 | Müşteri Onay Akışı | P0 |
| E1.5 | Muhasebeye Aktarım (dosya) | P0 |
| E1.6 | Dispute / İtiraz Yönetimi | P1 |
| E1.7 | Konfigürasyon (Risk kuralları, dönem yönetimi) | P1 |
| E1.8 | Mutabakat Dashboard'u | P1 |

### Faz 2 — Faturalama Takibi

| Epik | Açıklama | Öncelik |
|---|---|---|
| E2.1 | Kesilen Fatura Kayıtları | P0 |
| E2.2 | Fatura-Case Eşleme | P0 |
| E2.3 | Açık Alacak Havuzu | P0 |
| E2.4 | Vade Takip Motoru | P0 |
| E2.5 | Muhasebe ACK otomasyonu | P1 |
| E2.6 | Fatura İptal / Ters Kayıt | P2 |

### Faz 3 — Tahsilat Yönetimi + Raporlar

| Epik | Açıklama | Öncelik |
|---|---|---|
| E3.1 | Tahsilat Hareketleri | P0 |
| E3.2 | Kısmi Tahsilat & Netting | P0 |
| E3.3 | Yaşlandırma Snapshot Motoru | P0 |
| E3.4 | Yönetim Dashboard (Excel KPI ikamesi) | P0 |
| E3.5 | Top 10 / Yoğunlaşma / Risk Dağılımı | P0 |
| E3.6 | PDF/Excel Yönetici Paketi | P1 |
| E3.7 | Otomatik Uyarılar (vade, yanıt vermeyen müşteri) | P2 |
| E3.8 | Doğrudan Logo Entegrasyonu | P3 |
| E3.9 | TARS / Power BI Canlı Entegrasyon | P3 |

---

## 3. Entity Backlog

| Entity | Faz | Not |
|---|---|---|
| `ReconciliationFlow` (enum/config) | 1 | `Insurance`, `Automotive` |
| `ReconciliationBatch` | 1 | Import paketi |
| `ReconciliationSourceRow` | 1 | Ham satır (audit) |
| `ReconciliationCase` | 1 | Müşteri + dönem + flow |
| `ReconciliationLine` | 1 | Faturalanacak kalem |
| `ReconciliationDecision` | 1 | Append-only aksiyon log'u |
| `AccountingInstruction` | 1 | Muhasebeye gidecek kayıt |
| `RiskRuleSet` | 1 | Grup bazlı risk eşiği |
| `DisputeReason` (seed) | 1 | Kodlu liste |
| `IssuedInvoice` | 2 | Kesilen fatura |
| `ReceivableItem` | 2 | Açık alacak |
| `InvoiceCaseLink` | 2 | Fatura ↔ Case eşleme |
| `CollectionTransaction` | 3 | Tahsilat hareketi |
| `CollectionAllocation` | 3 | Tahsilatın hangi kalemi kapattığı |
| `AgingSnapshot` | 3 | Dönemsel yaşlandırma özeti |
| `CustomerCollectionStatus` | 3 | Müşteri bazlı konsolide görünüm (materialized view) |
| `CollectionAlertRule` | 3 | Otomatik uyarı kuralları |

---

## 4. Ekran Backlog

### 4.1 Faz 1 — MVP Ekranları

| # | Ekran | Kapsam | Öncelik |
|---|---|---|---|
| S1 | **Mutabakat Ana Sayfa** | 4 KPI kartı (açık case, müşteri onayı bekleyen, muhasebe bekleyen, bu ay kapanan), "devam eden işlerim" listesi | P0 |
| S2 | **Batch Listesi** | Import edilen dosyalar, statü, satır sayısı, parse hataları | P0 |
| S3 | **Batch Detay + Import Ekranı** | Dosya yükle, kolon eşleme önizleme, hata satırları, parse et butonu | P0 |
| S4 | **Case Listesi (Sigorta)** | Müşteri × dönem kırılımı, statü filtresi, sahibi | P0 |
| S5 | **Case Listesi (Otomotiv)** | Ayrı menü, aynı kırılım | P0 |
| S6 | **Case Detay — Lines Grid** | Line tablosu, inline düzenleme, statü, fiyat eşleşmesi | P0 |
| S7 | **Müşteriye Gönderme Modal'ı** | E-posta şablonu, onay linki veya PDF ek | P0 |
| S8 | **Müşteri Onay Kaydı** | İtiraz yönetimi, evidence file upload | P0 |
| S9 | **Muhasebeye Aktarım Ekranı** | Hazır case'ler, export formatı seç, tek tık export | P0 |
| S10 | **Konfigürasyon: Risk Kuralları** | Flow bazlı eşikleri güncelle (effective_from ile versiyonlu) | P1 |
| S11 | **Konfigürasyon: Dönem Yönetimi** | Açık/kapalı dönemler | P1 |
| S12 | **İtiraz Yönetimi Listesi** | Tüm Disputed line'lar (flow filtresi) | P1 |

### 4.2 Faz 2 — Faturalama Ekranları

| # | Ekran | Kapsam | Öncelik |
|---|---|---|---|
| S13 | **Kesilen Faturalar** | Fatura no, tarih, vade, tutar, bağlı case | P0 |
| S14 | **Fatura Bekleyenler** | Muhasebeye gönderildi ama fatura kesilmedi | P0 |
| S15 | **Açık Alacak Havuzu** | Tüm açık kalemler + vade durumu | P0 |
| S16 | **Fatura Detay** | Bağlı line'lar, tahsilat geçmişi (read-only Faz 2'de) | P1 |

### 4.3 Faz 3 — Tahsilat + Rapor Ekranları

| # | Ekran | Kapsam | Öncelik |
|---|---|---|---|
| S17 | **Tahsilat Hareketleri** | Banka/POS hareketi giriş + otomatik eşleme | P0 |
| S18 | **Kısmi Tahsilat / Allocation** | Bir ödemenin hangi kalemleri kapattığı | P0 |
| S19 | **Yönetim Dashboard** | Excel'deki 4 KPI kartı + müşteri tablosu + top 10 + yoğunlaşma + risk dağılımı | P0 |
| S20 | **Müşteri 360 Görünümü** | Tek müşteri için case geçmişi, fatura, tahsilat zaman tüneli | P1 |
| S21 | **Riskli Müşteriler** | Gecikme + tutar + pay bazlı sıralama | P1 |
| S22 | **Yönetici PDF/Excel Paket** | Tek tuş export | P1 |
| S23 | **Otomatik Uyarı Kural Yönetimi** | Vade yaklaşanlar, uzun süre yanıt vermeyenler | P2 |

---

## 5. Kullanıcı Hikayesi Örnekleri

### Faz 1

**US-1 (Sigorta import)** — *Mutabakat uzmanı* olarak, AK Sigorta'nın mart ayı poliçe listesini yükleyip her poliçeye ait paket ve fiyat eşleşmesini görmek istiyorum, çünkü sözleşme dışı paketleri hızla fark etmeliyim.

Kabul:
- Xlsx/CSV yüklerim, başlıkları sistem eşler
- Hatalı satırlar ayrı listede gösterilir
- Her müşteri × dönem için otomatik Case oluşur
- Sözleşme dışı paketler `PricingMismatch` işaretlenir

**US-2 (Otomotiv import)** — *Mutabakat uzmanı* olarak, Power BI'dan aldığım aylık kullanım raporunu yüklediğimde sistemin bayi bazında Case oluşturmasını istiyorum.

**US-3 (Müşteriye gönderme)** — *Mutabakat uzmanı* olarak, bir Case'i müşteriye göndermeden önce sistem tüm satırların `Ready` olduğunu doğrulamalı.

**US-4 (Müşteri itirazı)** — *Mutabakat uzmanı* olarak, müşterinin itirazını `DUPLICATE` sebep koduyla kaydettiğimde ilgili line `Rejected` statüye geçmeli ve notum eklenmeli.

**US-5 (Muhasebeye aktarım)** — *Mali işler* olarak, `ReadyForAccounting` case'lerini tek tıkla Excel olarak export edip muhasebeye iletmek istiyorum.

**US-6 (Risk eşiği değişikliği)** — *Admin* olarak, otomotiv grubu için ORTA risk eşiğini 10'dan 15 güne değiştirirken bunu audit log'unda görülebilir yapmak istiyorum.

### Faz 2

**US-7 (Fatura kayıt)** — *Muhasebe* olarak, kesilen faturanın numarasını `AccountingInstruction`'a bağlayarak case'i `Invoiced` statüsüne geçirmek istiyorum.

**US-8 (Vade izleme)** — Her gün 06:00'da yaşlandırma snapshot'ı otomatik üretilmeli.

### Faz 3

**US-9 (Kısmi tahsilat)** — *Mali işler* olarak, 500.000 ₺ ödemenin 3 farklı faturayı kapattığını belirterek allocation yapmak istiyorum.

**US-10 (Yönetici dashboard'u)** — *CEO* olarak, ay içinde tahsilat performansını Excel açmadan görmek istiyorum.

---

## 6. Cross-cutting Gereksinimler

| Başlık | Not |
|---|---|
| **KVKK / Audit** | Tüm statü değişiklikleri + kullanıcı + zaman damgası. Retansiyon 7 yıl (mevcut kurala uyumlu). |
| **Multi-tenant** | Her entity'de `company_id`. RLS + EF query filter. |
| **i18n** | TR default, EN mirror (mevcut kurala uyum). |
| **Observability** | Serilog → Seq; kritik akışlarda (export, state transition) `Information` log. |
| **Performance** | Case listesi 10.000 satıra kadar < 1 sn. Dashboard cache'lenebilir (5 dk TTL). |
| **Security** | Dosya upload: virüs tarama + MIME kontrolü + 50 MB limit. |
| **Accessibility** | WCAG 2.1 AA mevcut standartta. |

---

## 7. Bağımlılıklar

| Bağımlılık | Durum | Not |
|---|---|---|
| `Customer` entity (mevcut bütçe modülü) | Var | `external_customer_ref` alanı eklenecek |
| `Contract` + `PriceBook` | Kısmen | Faz 1 önkoşulu — ayrı spec yazılmalı |
| OpenIddict auth | Var | Rol eklenecek: `ReconAgent` |
| Multi-tenant RLS | Var | Yeni tablolar için genişletilecek |
| Audit log altyapısı | Var | Yeni event tipleri tanımlanacak |
| ClosedXML (Excel export) | Var | Tekrar kullanılacak |

---

## 8. Faz Geçiş Kriterleri

### Faz 1 → Faz 2 geçiş için
- Sigorta + Otomotiv uçtan uca en az 1 gerçek dönem işlendi
- Pilot mutabakat ekibi (2 kullanıcı) 2 sprint boyunca kullandı
- 20+ case kapandı
- Kritik (P0) buglar: 0

### Faz 2 → Faz 3 geçiş için
- Muhasebe ekibi Faz 2'yi 1 dönem kullanıyor
- Fatura-case eşleme doğruluğu >%99
- Açık alacak havuzu gerçekçi (finans ekibi doğruladı)

---

## 9. MVP (Faz 1) Sprint Planı Taslağı

Tahmini 6-8 hafta, 4 sprint (her biri 2 hafta):

### Sprint 1
- Entity + migration (E1.2 temel)
- Import parser iskeleti (E1.1)
- Batch + SourceRow endpoint'leri
- S2 Batch Listesi UI

### Sprint 2
- Case akışı + state machine (E1.2)
- Line yönetimi + PricingMismatch mantığı (E1.3)
- S3, S4, S5, S6 UI

### Sprint 3
- Müşteri onay akışı (E1.4)
- Dispute yönetimi (E1.6)
- S7, S8, S12 UI

### Sprint 4
- Muhasebe export (E1.5)
- Konfigürasyon ekranları (E1.7)
- S9, S10, S11 UI
- Dashboard (E1.8) + S1 UI
- UAT + bugfix + döküman

---

## 10. Risk Listesi ve Mitigasyonu

| Risk | Etki | Mitigasyon |
|---|---|---|
| Sözleşme fiyat tablosunun eksik/tutarsız olması | Yüksek | Faz 1 önkoşulu: PriceBook temizliği + import |
| Logo müşteri kodu ↔ iç müşteri ID eşlemesi sorunlu | Orta | İlk import'ta eşleme asistanı + manuel düzeltme UI'ı |
| Sigorta şirketlerinin farklı Excel formatları | Orta | Başlık mapping toleransı + şirket bazlı şablon seçimi (Faz 2) |
| TARS/Power BI export değişikliği | Orta | Kolon şemasına sürüm numarası + migration kılavuzu |
| Mutabakat ekibinin adaptasyonu (Excel → sistem) | Yüksek | 2 sprint boyunca paralel çalışma (sistem + Excel); eğitim videoları |
| KVKK kapsamında müşteri onay e-postası | Düşük | Legal onayı Faz 1 içinde alınacak; e-posta şablonu standart |
| Muhasebenin ACK sürecini reddetmesi | Orta | Pilot muhasebe kullanıcısı ile Faz 1 başında onay; format revizyonu esnek |

---

## 11. Başarı Ölçütleri (Tüm Modül)

- Mutabakat süresinin ayda ortalama Excel ile X günden sistem ile Y güne düşmesi (baseline ölçülmeli)
- Müşteri itirazlarının kayıt altında olması (bugün %0 → hedef %100)
- Muhasebeye aktarım hata oranı <%1
- Ay sonu yönetici raporunun hazırlık süresinin 3 günden <1 saate düşmesi
- Ay sonu alacak/tahsilat tablosu gerçek zamanlı (bugün T+2)
