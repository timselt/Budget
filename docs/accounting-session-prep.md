# Muhasebe Seansı Hazırlık Dokümanı

> **2026-04-21 notu:** Bu şablon içindeki Shadow Run (F8) + F9 Excel Emekliliği atıfları iptal edildi — shadow run planı 2026-04-21'de tamamen kaldırıldı. Şablon iş soru setleri hâlâ kullanılabilir; sadece "shadow run öncesi" / "shadow run raporu" cümleleri geçerli değil.

> **Zamanlama:** F6 ile F7 arasında, 1 saat. FinOps Tur prod deploy öncesi son karar fırsatı.
> **Katılımcılar:** Timur (proje sahibi), CFO / muhasebe müdürü, opsiyonel: mali müşavir.
> **Çıktı:** CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #1–#4 kapanır, teknik karşılıkları F7 başlangıcında migration'a girer.

---

## Format

Her madde için:
- **Soru** (muhasebe ekibine)
- **Teknik karşılık** (sistemde nereyi etkiler)
- **Varsayılan / şu anki değer** (karar alınmazsa ne kalır)
- **Çıktı alanı** (toplantıda doldurulur)

---

## Madde 1 — "Holding Giderleri" sınıflandırması

**Soru:** "Holding Giderleri" kalemi P&L'de GENERAL giderler (Şirket Genel) mi EXTRAORDINARY (Olağandışı) mı sınıflanmalı? Mevcut Excel şablonu hangisini kullanıyor?

**Teknik karşılık:**
- `expense_categories` seed (`InitialSchema` migration §3.2 `HOLDING` satırı).
- Şu anki değer: `HOLDING → GENERAL` (tahmin, ADR-0002 §2.5'te açıklanmış).
- KPI hesaplamasını etkiler: EBITDA'nın altında mı üstünde mi kalacak.

**Varsayılan (karar alınmazsa):** `GENERAL` olarak kalır, muhasebe onayı olmadan prod'a gitmez.

**Karar:** ______________________________________________

**Gerekçe:** _____________________________________________

---

## Madde 2 — "Amortisman" sınıflandırması doğrulaması

**Soru:** Amortisman giderleri TECHNICAL (teknik/üretim) gider olarak sınıflanmış. Muhasebe ekibi için bu doğru mu, yoksa GENERAL (yönetim) altında olmalı mı?

**Teknik karşılık:**
- `expense_categories` seed `AMORTISMAN → TECHNICAL` (mevcut).
- KPI: "Teknik Marj" hesaplamasına dahil, EBITDA öncesi.

**Varsayılan:** `TECHNICAL` (Excel şablonu + Day-1 kararı).

**Karar:** ______________________________________________

**Gerekçe:** _____________________________________________

---

## Madde 3 — "SGK Teşvik" segmenti operasyonel detayı

**Sorular:**
1. SGK Teşvik hangi cari hesaplardan geliyor? (müşteri segmentleri hangileri)
2. Tahakkuk mu, tahsilat mı bazlı raporlanıyor?
3. Karşı taraf kim — SGK mı, müşteri mi (sigorta şirketi, banka)?
4. Aylık mı yıllık mı tahakkuk?

**Teknik karşılık:**
- `segments` tablosunda `SGK_TESVIK` segment'i mevcut (5 segmentten biri).
- `Customer.SegmentId` → segment.
- `BudgetEntry.EntryType = Revenue` + `amount_original` TRY.

**Varsayılan:** Segment mevcut ancak hangi müşterilerin buraya düştüğü manuel atama; master data init sırasında muhasebe tarafından doldurulacak.

**Karar:** ______________________________________________

**Gerekçe + örnek müşteri(ler):** ____________________________

---

## Madde 4 — Müşteri Konsantrasyon Eşik Değerleri

**Soru:** Dashboard'da müşteri konsantrasyon uyarısı için eşik değerleri nedir?
- Öneri: **%30 uyarı** (tek müşteri portföyün >%30'u) / **%50 kritik** (tek müşteri >%50)
- Alternatif: HHI indeksi eşiği (endüstri standart >0.25 yüksek konsantrasyon)

**Teknik karşılık:**
- `Application.Calculations.KpiCalculationEngine.ConcentrationThresholds` sabit (ya da config) güncellenir.
- Dashboard chart (DashboardPage müşteri konsantrasyon kartı) bu eşiğe göre warning/critical renk gösterir.

**Varsayılan:** %30 / %50 (öneri).

**Karar:** _________________________________  /  __________________________________
            (uyarı eşiği)                        (kritik eşik)

**Ek: HHI eşiği kullanılacak mı?** [ ] Evet → ________  [ ] Hayır

---

## Ek Not — Shadow Run Beklentisi

Bu 4 maddenin kararları F7 deploy'una girer. F8 Shadow Run sırasında (~2 hafta) Excel çıktıları ile sistem çıktıları karşılaştırılır. Fark tespit edilirse:

- **Excel otorite** — sistem düzeltilene kadar Excel gerçek hakikat.
- **Fark > tolerans** → issue açılır (GitHub), root cause bulunur, patch deploy edilir.
- **2 hafta sıfır fark** başarıldığında F9 Excel Emekliliği'ne geçilir.

Bu 4 madde shadow run karşılaştırmasında **kritik fark noktaları** — kararlar doğru alınmamışsa her hafta rapor farklı çıkar.

---

## Seans Sonrası — Uygulama Adımları (Timur)

1. Bu doküman doldurulmuş halde commit'le (`docs/accounting-session-decisions-2026-MM-DD.md` olarak rename).
2. `expense_categories` seed değişikliği → yeni EF migration (`AddAccountingSessionUpdates`).
3. `ConcentrationThresholds` sabit güncellemesi (KpiCalculationEngine veya config).
4. CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #1–#4 "Kapandı" bölümüne taşınır, tarih + karar referansı.
5. F7 deploy branch'i açılır.
