# Tasarım Kararı: UI/UX Entegrasyonu (Manus AI Referans Dokümanından)

**Tarih:** 2026-04-15
**Karar Sahibi:** Timur Selçuk Turan
**Statü:** Onaylandı, master spec'e işlendi
**İlgili Master Spec Bölümleri:** 13, 14, 15
**İlgili Diğer Tasarım:** `2026-04-15-acik-kararlar-design.md`

---

## 1. Bağlam

Master spec `docs/BUTCE_TAKIP_YAZILIMI.md` v2.0.0 mimari, güvenlik, çoklu kiracılık (multi-tenant), bütçe versiyonlama, onay akışı, çoklu para birimi, KVKK ve audit tarafında **derin** ama UI/UX katmanında **yüzeysel** kalıyordu. Ekran-ekran içerikler, KPI dashboard kompozisyonu, formül zinciri görselleştirmesi, sayfa-sayfa kullanıcı akışları, renk paleti ve tipografi sözleşmesi yoktu.

Aynı dönemde Manus AI tarafından `docs/plans/Bütçe Yönetim Sistemi — Kapsamlı Proje Dokümanı.md` adlı v1.0 dokümanı hazırlanmıştı. Bu doküman tamamen farklı bir teknoloji yığını öneriyordu (Express + tRPC + MySQL + Manus OAuth) ama **UI/UX ve sayfa içerikleri tarafında somut, üretime yakın kararlar** içeriyordu.

Karar: **Manus dokümanını teknoloji açısından reddet, UI/UX açısından adapte et.**

---

## 2. Karar

Aşağıdaki parçalar Manus dokümanından alınıp master spec'e (Bölüm 13/14/15) entegre edildi. Geri kalanı reddedildi.

### 2.1 Alınan Parçalar

| Bölge | Manus Bölümü | Master Spec'e Eklendi |
|------|--------------|------------------------|
| Renk paleti (OKLCH) | 3.2 | §13.2 |
| Grafik renkleri | 3.3 | §13.3 |
| Tipografi (Inter, font-feature-settings, KPI sınıfları) | 3.4 | §13.4 |
| Bileşen stil sözleşmesi (kart, tablo, sidebar) | 3.5 | §13.5 |
| Sidebar navigasyon (8 sayfa, Lucide ikonları) | 6.1 | §14.1 |
| Dashboard KPI üst sıra (Gelir, Hasar, Teknik Marj, EBITDA) | 6.2 | §14.2 |
| Dashboard KPI alt sıra (LR, CR, Gider Rasyosu, Personel/Gelir) | 6.2 | §14.2 |
| Aylık bar chart + segment donut chart | 6.2 | §14.2 |
| Segment performans tablosu | 6.2 | §14.2 |
| **Müşteri Konsantrasyon Oranı KPI** (Top 5 / Total) | 6.2 | §14.2 — yeni KPI |
| Gider kırılımı progress bar listesi | 6.2 | §14.2 |
| **8 adımlık formül zinciri görseli** | 6.2 | §14.2 |
| Bütçe Girişi sayfa içeriği | 6.3 | §14.3 |
| Gider Girişi 3 bölüm yapısı (kalemler / GG Toplam / P&L Ek) | 6.4 | §14.4 |
| BvA Raporu 4 bölüm | 6.5 | §14.5 |
| Trend Analizi 5 grafik | 6.6 | §14.6 |
| Müşteri Rehberi sayfa | 6.7 | §14.7 |
| Import/Export 3 sekme + şablon formatları | 6.8 | §14.8 |
| Ayarlar sayfa | 6.9 | §14.9 |
| Erişim matrisi tablosu | 8.3 | §14.10 (genişletilmiş) |
| TRY kısaltma kuralları (Mrd / Mln / Bin) | 12 | §15.1 |
| Yüzde formatı, sayısal hücre kuralları | 12 | §15.2, §15.3 |
| **5. segment "SGK Teşvik"** | 11.1 | §3.2 seed verisi (kullanıcı onayı: A) |
| **9 gider kategorisi seed listesi** | 11.2 | §3.2 seed verisi |

### 2.2 Reddedilen Parçalar

| Manus Önerisi | Reddedilme Sebebi | Master Spec Karşılığı |
|---------------|-------------------|-----------------------|
| Express 4 + tRPC 11 backend | Karar verilmiş .NET 9 | §2.2 |
| MySQL (TiDB) + Drizzle ORM | Karar verilmiş PostgreSQL 16 + EF Core | §2.2 |
| Manus OAuth + JWT | Vendor lock-in, KVKK belirsiz; Karar #5 | §12, §13 (eski) |
| 6 tablolu basit şema | Çoklu kiracı, versiyonlama, onay, audit eksik | §3.2 (20+ tablo) |
| Tek `periods.status` enum (Taslak/Onaylandı/Kilitli) | Versiyonlama yok, snapshot yok, parent versiyon yok | `budget_versions` + state machine |
| Tek para birimi (sadece TRY) | Karar #2 çift raporlama | §3.2 yeni kolonlar |
| "İlk giriş yapan otomatik admin" pattern | Güvenlik açığı; davet bazlı kullanıcı yaratma şart | Admin tarafından davet |
| 9 sabit gider kategorisi (kod içinde hardcoded) | Esneklik yok; Karar #3 tablo bazlı | `expense_categories` tablosu + tip kolonu |
| xlsx (SheetJS) frontend Excel parser | Backend'de validasyon zayıf, RLS bypass riski | ClosedXML backend, frontend sadece upload |
| shadcn table | 500×15 ölçeğinde performans + range copy-paste yetersiz | AG-Grid Community (Karar #6) |
| Manus'un 9 testi | Yetersiz (regression fixture, RLS, integration testleri yok) | §8 test stratejisi (Testcontainers + golden files) |
| Audit log yokluğu | KVKK ve mali mevzuat 7 yıl saklama gerektirir | `audit_logs` partitioned tablo |

---

## 3. Şema Üzerine Etki

Aşağıdaki tablolar UI/UX entegrasyonu sebebiyle genişledi veya seed aldı:

### 3.1 `segments` (seed)

Manus referansından **5. segment "SGK Teşvik"** eklendi (kullanıcı onayı 2026-04-15, Seçenek A). Toplam 5 segment:

```
SIGORTA      Sigorta Şirketleri      (display_order: 1)
OTOMOTIV     Otomotiv Şirketleri     (display_order: 2)
FILO         Filo Şirketleri         (display_order: 3)
ALTERNATIF   Alternatif Kanallar     (display_order: 4)
SGK_TESVIK   SGK Teşvik              (display_order: 5)
```

### 3.2 `expense_categories` (seed)

Manus'un 9 sabit kategorisi master spec şemasına seed olarak girdi. Her kategoriye Karar #3 gereği `classification` (TECHNICAL/GENERAL/FINANCIAL) atandı:

| Kod | Adı | Sınıf | Açıklama |
|-----|-----|-------|----------|
| PERSONEL | Personel Giderleri | GENERAL | Maaş, SGK, prim, yan haklar |
| SIRKET_GENEL | Şirket Genel Giderleri | GENERAL | Kira, enerji, ofis |
| IT | IT Giderleri | GENERAL | Yazılım, donanım, lisans |
| ARAC | Araç Giderleri | GENERAL | Filo, yakıt, bakım |
| FINANSMAN | Finansman Giderleri | FINANCIAL | Faiz, komisyon |
| HOLDING | Holding Giderleri | GENERAL | Grup şirket paylaşımları |
| DIGER | Diğer Giderler | GENERAL | Sınıflandırılmamış |
| FINANSAL_GELIR | Finansal Gelir | FINANCIAL | Faiz geliri, kur farkı (P&L zinciri) |
| AMORTISMAN | Amortisman | TECHNICAL | Maddi/maddi olmayan varlık (P&L zinciri) |

> **Doğrulama notu:** Bu sınıflandırma Manus'un kategorilerinden türetilmiştir. Tur Assist Group muhasebe ekibinin onayı sonrası gerekirse `classification` değerleri ADR ile güncellenir. Özellikle "Holding Giderleri"nin GENERAL mi yoksa EXTRAORDINARY mi sayılacağı tartışmaya açıktır.

### 3.3 Yeni KPI: Müşteri Konsantrasyon Oranı

Master spec §5.1 KPI listesine eklenecek:

```
Müşteri Konsantrasyon Oranı = Σ(Top 5 müşteri geliri) / Toplam Gelir
```

**Eşik değerler:**
- < %30 → düşük risk (yeşil)
- %30–%50 → orta risk (amber)
- > %50 → yüksek konsantrasyon riski (kırmızı, alert tetiklenir)

Bu KPI dashboard'da Top 5 müşteri kartının altında yüzde olarak gösterilir ve `alert_rules` tablosunda `rule_type='CONCENTRATION'` ile tanımlanabilir.

---

## 4. Frontend Bileşen Yapısı

Master spec'te §2.4 frontend klasör yapısı, Manus'un sayfa listesine göre güncellenir:

```
client/src/
├── pages/
│   ├── Dashboard.tsx          # §14.2
│   ├── BudgetEntry.tsx        # §14.3 (AG-Grid)
│   ├── ExpenseEntry.tsx       # §14.4
│   ├── BvaReport.tsx          # §14.5
│   ├── Trends.tsx             # §14.6
│   ├── Customers.tsx          # §14.7
│   ├── ImportExport.tsx       # §14.8
│   └── Settings.tsx           # §14.9
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   └── Sidebar.tsx
│   ├── kpi/
│   │   ├── KpiCard.tsx
│   │   └── FormulaChain.tsx   # 8 adımlık görsel
│   ├── charts/
│   │   ├── MonthlyBarChart.tsx
│   │   ├── SegmentDonut.tsx
│   │   ├── BvaChart.tsx
│   │   ├── TrendLine.tsx
│   │   └── YtdAreaChart.tsx
│   ├── tables/
│   │   ├── BudgetGrid.tsx     # AG-Grid wrapper
│   │   ├── BvaTable.tsx
│   │   └── SegmentTable.tsx
│   └── ui/                    # primitive bileşenler
├── hooks/
│   ├── useFormatTRY.ts
│   ├── useDashboardData.ts
│   └── useBudgetGrid.ts
├── lib/
│   ├── format.ts              # §15 TRY/yüzde formatlama
│   ├── colors.ts              # §13.2 token okuma
│   └── apiClient.ts
└── styles/
    ├── tokens.css             # §13.2-13.3 tüm OKLCH değişkenler
    ├── typography.css         # §13.4 Inter + font-feature-settings
    └── global.css
```

Web coding-style kuralı (`~/.claude/rules/web/coding-style.md`) "by feature" organizasyon önerir; yukarıdaki yapı bunu uygular.

---

## 5. Açık Sorular ve Doğrulama Maddeleri

Aşağıdaki maddeler implementation öncesi netleştirilmelidir. Kritik değil ama sprint başlangıcında muhasebe ekibiyle teyit edilmeli:

1. **"Holding Giderleri" sınıfı:** GENERAL mi EXTRAORDINARY mi? Şu an GENERAL varsayıldı.
2. **"Amortisman" sınıfı:** Manus dokümanında P&L zincirinde "Net Kar/Zarar = Teknik Kar + Finansal Gelir − Amortisman" denmiş. Bu durumda amortisman TECHNICAL mi olmalı yoksa ayrı bir sınıf mı? Şu an TECHNICAL atandı, doğrulanmalı.
3. **"SGK Teşvik" segmenti:** Tur Assist Group'ta gerçekten aktif bir segment mi, yoksa proje gelirleri için ayrı bir kategori mi? Kullanıcı onayı verdi (5 segment dahil edildi) ama segmentin operasyonel detayı (kaç müşteri, hangi gelir tipi) doğrulanmalı.
4. **Müşteri Konsantrasyon eşik değerleri:** %30/%50 önerildi. CFO'nun istediği eşik farklı olabilir.
5. **Şablon formatı dil seçimi:** Excel şablonlarındaki başlıklar Türkçe ("Müşteri Kodu", "Tür", "Ocak"...). Bazı muhasebe sistemleri İngilizce export verir. Alias mekanizması düşünülmeli (P2).

---

## 6. Onay

- ✅ Kullanıcı (Timur Selçuk Turan) — 2026-04-15
- ✅ Master spec güncellendi: Bölüm 12 dondurma + Bölüm 13/14/15 eklendi + §3.2 seed
- ⏳ Muhasebe ekibi doğrulaması — Bölüm 5 maddeleri için bekleniyor (sprint başlangıcında)

---

## 7. Referanslar

- `docs/BUTCE_TAKIP_YAZILIMI.md` — Master teknik spesifikasyon (v2.0.0+)
- `docs/plans/2026-04-15-acik-kararlar-design.md` — 8 açık karar tasarım kayıtları
- `docs/plans/Bütçe Yönetim Sistemi — Kapsamlı Proje Dokümanı.md` — Manus AI referans dokümanı (v1.0, sadece UI/UX kısımları kullanıldı)
- `docs/plans/2026-04-15-butce-yazilimi-revize-plan.md` — İlk revize plan
- `docs/plans/2026-04-15-spec-degerlendirme.md` — Orijinal spec değerlendirmesi
- `~/.claude/rules/web/coding-style.md` — Frontend organizasyon kuralları
- `~/.claude/rules/web/design-quality.md` — Anti-template politikası
