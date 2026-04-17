# Schema Mapping — Reference SQL ↔ FinOps Tur Domain

Bu doküman, `docs/reference/butce_schema_v1.sql` referans şemasının terminolojisini mevcut .NET domain modeli (`src/BudgetTracker.Core`) ile eşler. Schema, Excel "Bütçe 2026.xlsx" modelinin PostgreSQL karşılığı olarak hazırlanmıştır; mevcut backend ise CLAUDE.md spec'iyle çoklu para birimi (Day-1) ve DDD katmanını eklemiştir.

**Genel sonuç:** Mevcut backend, schema'yı her açıdan kapsar veya aşar. Schema sadece kanonik referans + Excel formül zinciri kaynağı olarak değerli.

---

## 1. İsim Karşılığı (Glossary)

| Schema | Mevcut Backend | Not |
|---|---|---|
| `tenants` | — (yok) | Mevcut: `Company` = root tenant. CLAUDE.md "tenant=company" diyor. |
| `users` / `roles` / `user_roles` | `Identity/User`, `Identity/Role` (ASP.NET Identity) | Mevcut framework Identity ile, schema'daki manuel tablolardan üstün. |
| `segments` | `Segment` (TenantEntity) | Bire bir. |
| `company_groups` | `Company` | İsim çakışması. Schema "company_groups" = mevcut "Company" (Tur Assist iştirak). |
| `companies` (98 müşteri firma) | `Customer` | İsim çakışması. Schema "companies" = mevcut "Customer". |
| `expense_categories` | `ExpenseCategory` + `ExpenseClassification` enum | Granülarite farkı (schema 8 type, mevcut 4). |
| `budget_periods` | `BudgetYear` | Mevcut "year+lock" tek alan, schema "year+name+start/end+status" daha detaylı. |
| `budget_versions` | `BudgetVersion` | State machine birebir (8 state). EXCLUDE constraint mevcutta var. |
| `revenue_entries` + `claim_entries` | `BudgetEntry` + `EntryType` enum | Mevcut: 1 tablo + enum (Revenue/Claim) — schema'dan üstün. |
| `expense_entries` | `ExpenseEntry` | Multi-currency Day-1 (4 alan) mevcutta var, schema'da `amount_try_spot` eksik. |
| `adjustment_entries` | `SpecialItem` + `SpecialItemType` enum | **Domain modelleme farklı** — bkz. Bölüm 3. |
| `actual_*_entries` (4 tablo) | `ActualEntry` + `EntryType` + `ActualSource` enum | Mevcut: 1 tablo + 2 enum + ERP/Manual kaynak ayrımı. |
| `approvals` | `BudgetApproval` | Yapı paralel. |
| `audit_logs` (PARTITION BY RANGE) | `AuditLogEntry` + Hangfire `AuditPartitionMaintenanceJob` | Implementasyon farklı, sonuç eşdeğer. |
| `v_monthly_pnl`, `v_kpi_dashboard` vb. (10 view) | Application service katmanı (`VarianceService`, `BudgetEntryService` vb.) | View yerine LINQ + caching. Performans bottleneck olursa materialized view düşün. |

---

## 2. Mevcut'ta VAR — Schema'da YOK

Schema'nın kapsamadığı, mevcut backend'in eklediği bileşenler:

- **`Money` value object** + **`Currency` master entity** — multi-currency Day-1 spec birebir
- **`FxRate` entity** + **`TcmbFxService`** (TCMB XML feed) + **`FxConversionService`** (sabit/spot kur)
- **Hangfire** — `TcmbFxSyncJob`, `AuditPartitionMaintenanceJob`, `HangfireRecurringJobs`
- **`Scenario`** entity (Optimistic/Base/Conservative) + `ScenarioService`
- **`CollectionInvoice`** + `CollectionImportService` + `CollectionCalculationService` + `CollectionRiskLevel` (tahsilat domain)
- **`ImportPeriod`** + `ExcelImportService` + `PgAdvisoryImportGuard` (Excel import lock)
- **`UserSegment`**, **`UserCompany`**, `ITenantContext`, `TenantConnectionInterceptor`, `TenantResolutionMiddleware` (yetkilendirme + tenant context)
- **Serilog + Seq** + `BudgetTrackerLogEnricher` + `PiiMaskingEnricher` (KVKK)
- **QuestPDF** + **ClosedXML** raporlama (`PdfReportService`, `ExcelExportService`)

---

## 3. Schema'da VAR — Mevcut'ta YOK / Belirsiz

### 3.1 Mekanik Eklenti (low-risk migration)

**`Customer.IsOtherFlag` (`customers.is_other_flag` BOOL)** — Excel'deki "Diğer" alt-kırılım flag'i. Schema'da var, mevcut Customer entity'de yok. Tek alan migration ile eklenebilir.

### 3.2 Domain Karar — Açık Mesele

**Expense kategori seed** — Schema 17 kategori, mevcut 9. Eksikler:
`SEYAHAT, PAZARLAMA, DANISMANLIK, AGIRLAMA, ARAC_TURFILO, KONUT_KONFOR, DIGER_OLAGAN, T_KATILIM, YATIRIM`

Mevcut 9 kategori (PERSONEL, SIRKET_GENEL, IT, ARAC, FINANSMAN, HOLDING, DIGER, FINANSAL_GELIR, AMORTISMAN) muhtemelen MVP/prototip kapsamı. Schema'daki tam liste tüm Tur Assist faaliyet alanlarını kapsıyor. Karar: muhasebe ekibinden tam liste doğrulaması (her satırın `ExpenseClassification` mapping'iyle).

**Adjustment type domain ayrımı** — Schema ve mevcut farklı semantik gruplar:

| | Schema (`adjustment_type_enum`) | Mevcut (`SpecialItemType`) |
|---|---|---|
| 1 | IADE | MuallakHasar |
| 2 | TURFILO_PROVIZYON | DemoFilo |
| 3 | MUALLAK_KAYDI | FinansalGelir |
| 4 | MUALLAK_HESAPLAMA_DISI | TKatilim |
| 5 | — | Amortisman |

Schema "adjustment" kavramı **sadece sigorta hasar düzeltmeleri** (iade, provizyon, muallak ayrımı). Mevcut "SpecialItem" kavramı **hem sigorta-spesifik (Muallak/DemoFilo) hem genel finansal kalemler (FinansalGelir/TKatilim/Amortisman)** içeriyor.

Schema'da FinansalGelir/TKatilim/Amortisman = `expense_categories` (FINANSAL_GELIR, T_KATILIM, AMORTISMAN); mevcut'ta = `SpecialItem`. **Aynı veriyi farklı domain bucket'larında tutuyoruz**.

Karar gerekli:
1. Schema'nın domain ayrımına göre refactor (muhasebe-uyumlu) — `SpecialItemType` 4 sigorta-spesifik değer, FinansalGelir/TKatilim/Amortisman `ExpenseEntry` altına taşı
2. Mevcut domain ayrımını koru — schema'yı sadece referans olarak bırak, eşleşmeyen kavramları unutma

Bu karar muhasebe ekibinin onayı ile alınmalı (CLAUDE.md "Açık Doğrulama Bekleyen Maddeler" → "muhasebe seansı 2026-04-17" referansı).

---

## 4. Schema'nın Excel Hücre Referansları

Schema view'ları Excel formül zincirine birebir eşlenmiştir; bunlar mevcut service katmanının **doğrulama referansı** olarak değerli:

| View | Excel Hücre | Karşılık |
|---|---|---|
| `v_monthly_pnl.gelir_toplam` | O63 | `BudgetEntryService.GetMonthlyRevenue()` |
| `v_monthly_pnl.hasar_toplam` | O127 | `BudgetEntryService.GetMonthlyClaim()` |
| `v_monthly_pnl.teknik_marj` | O128 | derived |
| `v_monthly_pnl.loss_ratio` | O129 | derived |
| `v_monthly_pnl.toplam_gider` | O145 | `ExpenseEntryService.GetMonthlyTotal()` |
| `v_monthly_pnl.teknik_kz` | O147 | derived |
| `v_monthly_pnl.net_kz` | O152 | derived |
| `v_monthly_pnl.ebitda` | O153 | derived |
| `v_kpi_dashboard.*` | Dashboard R5 | `Dashboard` aggregation |

**Test stratejisi:** Schema view'larıyla mevcut service hesaplamalarının `golden_scenario_baseline.json` üzerinde sayısal eşitliği regression fixture olarak korunabilir.

---

## 5. Referans

- Schema kaynak: `docs/reference/butce_schema_v1.sql` (PostgreSQL 16 DDL, 533 satır)
- Brand referans: `docs/brand-system.md`
- Mimari karar: `docs/architecture.md` (ADR'ler)
- Stack özeti: `docs/TECH_STACK.md`
