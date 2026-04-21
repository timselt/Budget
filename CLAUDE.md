# CLAUDE.md — FinOps Tur

Tur Assist Grubu için çoklu kiracılı, KVKK-uyumlu bütçe planlama ve performans takip platformu. Excel tabanlı mevcut akışın yerini alır.

> **Referanslar:**
> - Teknoloji + mimari genel bakış: `docs/TECH_STACK.md`
> - ADR geçmişi: `docs/architecture.md`
> - UI tasarım kaynağı: `docs/FinOpsTur_Prototip.html` (dosya yoksa git history'den)

---

## Stack (Dondurulmuş — Bölüm 12)

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Backend | .NET + ASP.NET Core Web API | **10 LTS** |
| ORM | Entity Framework Core | 10 |
| DB | PostgreSQL | 16 |
| Auth | ASP.NET Identity + OpenIddict (MIT) | latest |
| Background jobs | Hangfire | latest |
| Logging | Serilog → Seq | — |
| Excel | ClosedXML | — |
| PDF | QuestPDF | — |
| Frontend | React + Vite + TypeScript | 19 / latest |
| Styling | Tailwind CSS | 4 |
| State | Zustand (UI) + TanStack Query (server) | latest |
| Charts | Chart.js + react-chartjs-2 | 4.4 / 5.3 |
| Testing | xUnit + NSubstitute + Testcontainers (backend); Playwright (frontend, ileride) | — |
| Hosting | Railway (Frankfurt) | — |

**Asla kullanma:** Redis, SignalR, Python microservice, Azure Blob Storage, in-memory SQLite, MySQL, Drizzle, Express, Manus OAuth, Duende IdentityServer (lisans), Handsontable (lisans), AG-Grid (Community range-paste eksiği), Recharts (Chart.js ile değiştirildi).

---

## Mimari Prensipler (Day-1, Kısayol)

1. **Multi-tenant Day-1** — Her işlem tablosunda `company_id`. EF global query filter + PostgreSQL RLS (defense-in-depth).
2. **Bütçe versiyonlama Day-1** — `budget_versions` + state machine + `EXCLUDE` constraint (tek aktif versiyon garantisi).
3. **Çoklu para birimi Day-1** — Her tutar: `amount_original`, `currency_code`, `amount_try_fixed`, `amount_try_spot`. TCMB Hangfire job 15:45 TR.
4. **Audit log Day-1** — Partitioned by month, append-only (DB role seviyesinde sadece INSERT), 7 yıl retention.
5. **Approval workflow Day-1** — DRAFT → SUBMITTED → DEPT_APPROVED → FINANCE_APPROVED → CFO_APPROVED → ACTIVE.
6. **Clean Architecture** — `Api / Application / Core / Infrastructure` 4 katman. Core bağımsız, dışarıya bağımlı değil.

---

## Aktif Kurallar (`~/.claude/rules/`)

Her oturumda otomatik yüklenir:

- `common/coding-style.md` — KISS, DRY, YAGNI, immutability, <800 satır dosya, <50 satır fonksiyon
- `common/testing.md` — TDD zorunlu, min %80 coverage, AAA pattern
- `common/development-workflow.md` — Research → Plan → TDD → Code Review → Commit
- `common/security.md` — Hardcoded secret yok, input validation, parameterized query
- `common/code-review.md` — CRITICAL/HIGH bloklar, MEDIUM uyarır
- `csharp/` — .NET idiomatic patterns, EF Core, async/await, nullable reference types
- `typescript/` — Strict mode, type safety, async correctness
- `web/coding-style.md` — Feature-based klasör organizasyonu
- `web/design-quality.md` — Anti-template (default Tailwind/shadcn görünümünden kaçın)
- `web/performance.md` — LCP <2.5s, INP <200ms, JS bundle <300kb (app), <150kb (landing)
- `web/security.md` — CSP nonce-based, XSS prevention, HTTPS headers

---

## Kullanılacak Ajanlar

**Otomatik (proaktif):**
- `csharp-reviewer` — Her .NET kod değişikliğinden sonra ZORUNLU
- `typescript-reviewer` — Her TS/React kod değişikliğinden sonra ZORUNLU
- `tdd-guide` — Yeni feature/bugfix öncesi (test-first)
- `code-reviewer` — Commit öncesi genel kalite
- `security-reviewer` — Auth, RLS, multi-tenant, KVKK kodları için
- `database-reviewer` — Şema, migration, query optimizasyonu için
- `silent-failure-hunter` — Audit/onay akışı kodlarında

**İhtiyaç anında:**
- `planner` — Yeni stage başlangıcı (S2-S15)
- `architect` — ADR yazımı, mimari kararlar
- `code-architect` — Yeni özellik blueprint'i
- `build-error-resolver` — Build hatası
- `performance-optimizer` — p95 SLO ihlali
- `refactor-cleaner` — Dead code temizliği
- `doc-updater` — CHANGELOG, codemap, README
- `e2e-runner` — Playwright kritik akış testleri
- `pr-test-analyzer` — Test coverage kalite incelemesi

**Paralel kullan:** Bağımsız işlerde aynı mesajda birden fazla ajan başlat.

---

## Klasör Yapısı (Hedef)

```
budget/
├── BudgetTracker.slnx
├── Directory.Packages.props
├── docker-compose.dev.yml
├── .gitignore
├── CLAUDE.md                   # bu dosya
├── AGENTS.md
├── CHANGELOG.md
├── docs/
│   ├── TECH_STACK.md           # mimari + teknoloji genel bakış
│   ├── architecture.md         # ADR-0001, ADR-0002, ...
│   └── CODEMAPS/
├── src/
│   ├── BudgetTracker.Api/             # ASP.NET Web API + OpenIddict
│   ├── BudgetTracker.Application/     # Use cases, DTOs, validators
│   ├── BudgetTracker.Core/            # Domain entities, value objects, interfaces
│   └── BudgetTracker.Infrastructure/  # EF Core, integrations
├── tests/
│   ├── BudgetTracker.UnitTests/
│   └── BudgetTracker.IntegrationTests/  # Testcontainers + Postgres 16
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── pages/
        ├── components/
        ├── lib/
        └── styles/
```

---

## Sık Kullanılan Komutlar

```bash
# Backend
dotnet build
dotnet test
dotnet run --project src/BudgetTracker.Api
dotnet ef migrations add <Name> --project src/BudgetTracker.Infrastructure --startup-project src/BudgetTracker.Api
dotnet ef database update --project src/BudgetTracker.Infrastructure --startup-project src/BudgetTracker.Api

# Frontend
cd client
pnpm install
pnpm dev
pnpm build
pnpm lint

# Veritabanı (geliştirme)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down

# Test (regression fixture)
dotnet test --filter Category=GoldenScenario
```

---

## Test Stratejisi (Kısayol)

- **Unit** — xUnit + NSubstitute, KPI formülleri, validator'lar, domain logic
- **Integration** — Testcontainers + **gerçek PostgreSQL 16** (in-memory SQLite YASAK — JSONB, RLS, partition uyumsuz)
- **E2E** — Playwright (kritik akışlar: login → bütçe gir → onay → varyans rapor)
- **Regression fixture** — `golden_scenario_baseline.json` (master spec §11.5 referans değerleri); her release'de doğrulanır
- **Performance** — k6, p95 SLO testleri
- **Security** — OWASP ZAP CI ayağı

---

## Bilinen Tuzaklar

1. **EF + RLS etkileşimi** — EF connection pool'u session GUC'ları (`app.current_company_id`) kaybedebilir. Her request'te middleware ile `SET LOCAL` veya custom `DbConnectionInterceptor`.
2. **Hangfire dashboard authorization** — Default açık. Production'da OpenIddict ile koru.
3. **TCMB XML drift** — Format değişikliği mümkün. Parser'da contract test + fallback (önceki günün kuru).
4. **AG-Grid range copy-paste** — Community sürümünde yok. Custom clipboard handler `useClipboardRange.ts` hook'unda yazılacak.
5. **Audit partition overflow** — Aylık partition + 84 aydan eski partition drop. Hangfire job ile otomatik (`AuditPartitionMaintenanceJob`).
6. **Banker's rounding** — Finansal hesaplamalar `MidpointRounding.ToEven` kullanmalı. Default `AwayFromZero` regresyon yaratır.
7. **Çift FX kolonu sync** — Bir tutar yazılırken her iki TRY kolonu (`amount_try_fixed`, `amount_try_spot`) atomic olarak hesaplanmalı. EF interceptor veya domain service.
8. **OpenIddict + EF migration sırası** — OpenIddict tabloları ayrı migration olmalı, ana domain migration'larından önce.

---

## Açık Doğrulama Bekleyen Maddeler

_2026-04-17 + 2026-04-21 muhasebe/iş seansı kararları kapandı._

**Yeni açık (sonraki muhasebe seansı için):**
- _Yok — tüm bekleyen maddeler 2026-04-21 iş seansında kapatıldı._

_Kapandı — artık açık olmayan:_
- ~~Excel şablon başlık dili~~ → **Türkçe sabit başlıklar** (`Müşteri`, `Segment`, `Ocak`…`Aralık`, `Toplam`). Detay: ADR-0008 §2.4.
- ~~Holding Giderleri sınıflandırması~~ → **GENERAL** (mevcut seed korundu).
- ~~Amortisman sınıflandırması~~ → **TECHNICAL** (mevcut seed teyidi).
- ~~SGK Teşvik operasyonel detayı~~ → **Şirket geneli tek satır, tahakkuk bazlı**; prod deploy sonrası muhasebe manuel müşteri tanımlar (`customer_code = 'SGK-TESVIK'`).
- ~~Müşteri Konsantrasyon eşikleri~~ → **%30 uyarı / %50 kritik**. `src/BudgetTracker.Application/Calculations/ConcentrationThresholds.cs` sabit sınıfı.
- ~~Expense kategori seed (ADR-0012)~~ → **8 eksik kategori eklendi** (SEYAHAT, PAZARLAMA, DANISMANLIK, AGIRLAMA, ARAC_TURFILO, KONUT_KONFOR, T_KATILIM, YATIRIM). Migration: `20260421_02_seed_missing_expense_categories`. Not: Şemanın `DIGER_OLAGAN` kodu backend'in mevcut `DIGER`/EXTRAORDINARY koduyla eşdeğer kabul edildi.
- ~~Ürün master listesi (ADR-0013 follow-up a)~~ → **4 ürün onaylandı**: Yol Yardım, İkame Araç, Konut, Warranty. Eksper/Sağlık/Mini Onarım kapsamda değil. SGK Teşvik zaten ayrı (şirket geneli tek kalem).
- ~~`CustomerProduct.CommissionRate` veri kaynağı stratejisi (ADR-0013 follow-up b)~~ → **İptal edildi**. İş modelinde komisyon yok; alan `20260418104134_RemoveCustomerProductCommissionRate` migration'ı ile zaten kaldırılmış durumda.
- ~~Mutabakat akış modeli (2 vs 4 akış)~~ → **4 akış onaylandı**: Sigorta + Otomotiv + Filo + Alternatif. Detay: ADR-0017 + 89 müşteri seed (`20260421_01_seed_pilot_customers`).
- ~~ProductsPage ↔ gerçek API bağlantısı~~ → **Zaten API'ye bağlı** (2026-04-18 itibarıyla). `/product-categories`, `/products`, `/segments` endpoint'leri kullanılıyor, mock yok. Eski "Müşteri × Ürün Matrisi" tasarımı ADR-0014 `Contract` modeliyle yerine geçti; `customer_products` tablosu migration `20260418203730_AddContractDomain` ile drop edildi. "Müşteri başına ürün listesi" görünümü artık `ContractsPage` üzerinden sağlanır.

**Implementation tamamlandı, muhasebe doğrulaması bekleyen:**
- **`BudgetEntry.ProductId` NOT NULL geçişi** (ADR-0013 follow-up c) — Shadow Run F8 bittikten sonra cutover olarak planlanacak.
- **Pilot fiyat listesi (placeholder)** — 89 müşteri × 11 SKU varyantı × placeholder fiyat seed yüklenecek. Muhasebe gerçek fiyatları sonra girecek. Rehber: `docs/Mutabakat_Modulu/seed/README.md`.

---

## Git & Commit

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- Her sprint sonunda `CHANGELOG.md` güncellenir
- Her mimari karar `docs/architecture.md`'ye yeni ADR olarak işlenir
- Kullanıcı açıkça istemedikçe commit yapma, push yapma
- `--no-verify` asla kullanma; pre-commit hook hatası fix-and-recommit

---

## İletişim

- Kullanıcı dili: **Türkçe**
- Yanıtlar kısa ve odaklı
- Karar gerektiren noktalarda çoktan seçmeli sor
- Açıklama yapmadan sessiz büyük değişiklik yapma
