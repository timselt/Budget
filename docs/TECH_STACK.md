# FinOps Tur — Mimari & Teknoloji Dokümanı

> **Platform:** Tur Assist Grubu için çoklu kiracılı, KVKK-uyumlu kurumsal bütçe planlama ve performans takip sistemi. Mevcut Excel tabanlı akışın yerini alır.
>
> **Teknoloji seçimleri dondurulmuştur** — değişiklik için ADR gerekir. Mimari kararların kronolojik kaydı `docs/architecture.md` içindedir (ADR-0001…ADR-0006).

---

## 1. Genel Mimari

```
┌──────────────────────────────────────────────────────────────┐
│  Tarayıcı  —  React 19 SPA (Vite)                           │
│              Tailwind v4 · Chart.js · TanStack Query        │
└──────────────┬───────────────────────────────────────────────┘
               │  Bearer JWT · /api/v1/* · /connect/token
               ▼
┌──────────────────────────────────────────────────────────────┐
│  ASP.NET Core 10 Web API (BudgetTracker.Api)                │
│  Controllers · Middleware · FluentValidation · OpenAPI      │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Application katmanı (BudgetTracker.Application)            │
│  Use-case servisleri · DTO · Validators · KPI Engine · FX   │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Core (BudgetTracker.Core) — Bağımlılık yok                 │
│  Domain Entities · Enums · Identity abstraksiyonları        │
└──────────────▲───────────────────────────────────────────────┘
               │
┌──────────────┴───────────────────────────────────────────────┐
│  Infrastructure (BudgetTracker.Infrastructure)              │
│  EF Core 10 · OpenIddict · Identity · TCMB · Excel · PDF    │
└──────────────┬───────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│ Postgres │      │ Seq (logs)   │
│   16     │      │              │
└──────────┘      └──────────────┘
```

Katman kuralları:
- **Core** hiçbir şeye bağımlı değildir; saf domain.
- **Application** sadece Core'a bağımlıdır; use-case + port arayüzleri burada.
- **Infrastructure** Application port'larını gerçekler (EF, HTTP, dosya).
- **Api** her şeyi bağlayan composition root + ince controller katmanı.
- Bağımlılıklar tek yönlü içe doğru akar (dependency inversion).

---

## 2. Teknoloji Seti

### Backend

| Katman | Teknoloji | Versiyon | Neden |
|---|---|---|---|
| Framework | .NET + ASP.NET Core Web API | **10 LTS** | Uzun destek penceresi; minimal API + MVC hibrit |
| ORM | Entity Framework Core | 10.0.6 | Npgsql provider 10.0.1, snake_case naming |
| DB | PostgreSQL | 16 (Alpine) | JSONB, partition, RLS, EXCLUDE constraint |
| Identity | ASP.NET Identity + OpenIddict | Identity 10.0.6 / OpenIddict 7.4 | **MIT lisans**, Duende IdentityServer lisans maliyetinden kaçınma |
| Auth şeması | Bearer JWT | — | `/connect/token` password + refresh grant |
| Validation | FluentValidation | 11.11 | Pipeline behavior ile request'lerde otomatik |
| Excel | ClosedXML | 0.104 | Excel içe/dışa aktarma |
| PDF | QuestPDF | 2025.1 | Yönetim Kurulu paketi, CFO raporu |
| Test | xUnit + NSubstitute + Testcontainers + Respawn | xUnit 2.9 | Gerçek Postgres (**SQLite in-memory yasak**) |
| Log | Microsoft.Extensions.Logging → Seq | — | `datalust/seq` container |
| Observability | HealthChecks | EF Core health check | `/health` endpoint |

**Central Package Management:** `Directory.Packages.props` ile tüm versiyonlar merkezi; csproj'larda versiyon yok.

### Frontend

| Katman | Teknoloji | Versiyon | Neden |
|---|---|---|---|
| Runtime | React | 19 | Concurrent rendering, use hook |
| Build | Vite | 8 | HMR, hızlı build |
| TypeScript | TS | ~6 (strict) | `strict: true` |
| Styling | Tailwind CSS | 4 (@tailwindcss/vite) | `@theme` ile design token tanımı |
| Design tokens | `src/styles/finopstur.css` | — | Utility class'lar (`card`, `chip`, `btn-*`, `ribbon-*`, `tbl`, `progress-track`, `tab`, `label-sm`…) prototipten birebir |
| State (UI) | Zustand | 5 | Sade, küçük, persist desteği |
| State (server) | TanStack Query | 5 | Cache + stale-while-revalidate; sayfa bazlı hook'lar |
| HTTP | Axios | 1.15 | Interceptor ile Bearer ve refresh token |
| Routing | React Router | 7 | Nested routes + AuthGuard |
| Charts | Chart.js + react-chartjs-2 | 4.4.1 / 5.3 | Prototip birebir uyum |
| Font | Inter + Material Symbols Outlined | — | Google Fonts, index.html'de preload |
| Test | Playwright | 1.59 | E2E + görsel doğrulama |

**Kullanılmayan:** Redis, SignalR, Python microservice, MySQL, Drizzle, Express, AG Grid (Community range paste yok), Recharts, Handsontable.

### Altyapı / DevOps

| Bileşen | Teknoloji |
|---|---|
| Dev DB | `docker-compose.dev.yml` — Postgres 16 (port 5435) + Seq (port 5341) |
| Hosting | Railway (Frankfurt) — tek bölge, düşük latency TR |
| Container | Dockerfile .NET 10 SDK/runtime |
| CI | (henüz yok, plan: GitHub Actions — build, test, Testcontainers) |

---

## 3. Proje Yapısı

```
budget/
├── BudgetTracker.slnx                   # solution (XML format)
├── Directory.Packages.props             # merkezi paket sürümleri
├── docker-compose.dev.yml               # dev Postgres + Seq
├── CLAUDE.md                            # AI asistan kılavuzu
├── AGENTS.md
├── CHANGELOG.md
│
├── src/
│   ├── BudgetTracker.Api/               # ASP.NET composition root
│   │   ├── Controllers/                 # 16 controller
│   │   ├── Middleware/                  # TenantContext middleware
│   │   ├── Filters/                     # exception, model state
│   │   └── Program.cs
│   │
│   ├── BudgetTracker.Application/       # use-case + DTO
│   │   ├── Approvals/
│   │   ├── Audit/
│   │   ├── BudgetEntries/
│   │   ├── Calculations/                # KPI engine
│   │   ├── Collections/
│   │   ├── Customers/
│   │   ├── Expenses/
│   │   ├── FxRates/
│   │   ├── Reports/
│   │   ├── Scenarios/
│   │   ├── SpecialItems/
│   │   ├── Variance/
│   │   └── Common/                      # pipeline, behaviors, result types
│   │
│   ├── BudgetTracker.Core/              # domain, bağımsız
│   │   ├── Entities/                    # 18 entity
│   │   ├── Enums/
│   │   └── Identity/
│   │
│   └── BudgetTracker.Infrastructure/
│       ├── Persistence/
│       │   ├── ApplicationDbContext.cs
│       │   ├── Configurations/          # Fluent API (entity × 19)
│       │   ├── Migrations/              # 5 migration
│       │   ├── Interceptors/            # TenantConnectionInterceptor
│       │   └── TenantContext.cs
│       ├── Identity/                    # Identity + OpenIddict seeder
│       ├── Authentication/
│       ├── FxRates/                     # TCMB HTTP client
│       └── Reports/                     # ClosedXML + QuestPDF
│
├── tests/
│   ├── BudgetTracker.UnitTests/
│   └── BudgetTracker.IntegrationTests/  # Testcontainers Postgres 16
│
├── client/                              # React SPA
│   ├── index.html
│   ├── vite.config.ts                   # /api + /connect proxy → :5100
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                      # lazy routes + AuthGuard
│       ├── index.css                    # @theme (Tailwind) + finopstur.css
│       ├── pages/                       # 11 sayfa
│       ├── components/
│       │   ├── layout/                  # AppLayout, Sidebar, TopNavBar, AuthGuard
│       │   ├── dashboard/               # FinOpsTrendChart, FinOpsSecondaryCharts
│       │   ├── forecast/                # ForecastChart
│       │   └── variance/                # WaterfallChart
│       ├── stores/                      # Zustand — auth, appContext
│       ├── lib/                         # api.ts, chart-config.ts, query.ts
│       └── styles/finopstur.css         # design system utility class'ları
│
├── infra/
│   └── postgres/init/                   # DB init script (extensions, roles)
│
└── docs/
    ├── architecture.md                  # ADR'ler (0001–0006)
    ├── TECH_STACK.md                    # bu doküman
    ├── CODEMAPS/
    └── screenshots/finopstur-ui/
```

---

## 4. Day-1 Mimari Prensipleri (Değişmez)

1. **Multi-tenant (Day-1)**
   - Her işlem tablosunda `company_id` kolonu
   - EF global query filter + PostgreSQL RLS (defense-in-depth)
   - `TenantContext` middleware request başına `app.current_company_id` GUC'u basıyor
   - Non-superuser `budget_app` rolüyle RLS aktif

2. **Bütçe versiyonlama (Day-1)**
   - `budget_versions` state machine: DRAFT → SUBMITTED → DEPT_APPROVED → FINANCE_APPROVED → CFO_APPROVED → ACTIVE
   - PostgreSQL **EXCLUDE constraint** ile şirket × yıl başına **tek aktif versiyon** DB seviyesinde garanti

3. **Çoklu para birimi (Day-1)**
   - Her tutar dört kolonla saklanır: `amount_original`, `currency_code`, `amount_try_fixed`, `amount_try_spot`
   - Günlük TCMB job'u 15:45 TR zamanında döviz kurlarını çekiyor
   - **Banker's rounding** (`MidpointRounding.ToEven`) — `AwayFromZero` regresyon yapıyor

4. **Audit log (Day-1)**
   - Aylık partition, append-only
   - DB role seviyesinde **sadece INSERT** izni — UPDATE/DELETE yasak
   - 7 yıl (84 ay) retention; otomatik partition drop job'u

5. **Onay akışı (Day-1)**
   - Bütçe + forecast versiyonları için çok seviyeli (Departman → Finans → CFO → CEO → YK)

6. **Clean Architecture — 4 katman**
   - Core, Application, Infrastructure, Api — bağımlılık tek yönlü içe

---

## 5. Veri Modeli (Ana Tablolar)

| Tablo | Amaç |
|---|---|
| `companies` | Tenant tanımı (6 şirket: Tur Assist, OtoKonfor, TUR Medical, KonutKonfor, SigortaAcentesi.com, RS Otomotiv) |
| `users`, `roles`, `user_companies`, `user_segments` | Identity + çoklu kiracılı yetki |
| `segments` | Hizmet hattı hiyerarşisi (Oto, Sağlık, Konut, Warranty, Genel, Grup) |
| `customers` | Sigortacı/banka/B2B2C müşteri tanımı |
| `currencies`, `fx_rates` | Para birimi + TCMB günlük kurlar |
| `budget_years` | Bütçe dönemi (FY 2024/2025/2026) |
| `budget_versions` | Versiyon + state machine + EXCLUDE constraint |
| `budget_entries` | Segment × hesap × ay × versiyon plan tutarları |
| `budget_approvals` | Onay zinciri kayıtları |
| `actual_entries` | Gerçekleşen (ERP sync + manuel) |
| `expense_categories`, `expense_entries` | OPEX + KKEG işaretlemesi |
| `special_items` | Amortisman, finansman, SGK teşvik gibi istisnalar |
| `scenarios` | Base / Optimistic / Conservative |
| `collection_invoices` | Müşteri tahsilat takibi |
| `import_periods` | Excel/ERP içe aktarma pencereleri |
| `audit_log` | Aylık partition, append-only |

---

## 6. Kimlik ve Yetkilendirme

- **ASP.NET Identity** — kullanıcı, rol, password hash (PBKDF2)
- **OpenIddict 7.4** — OAuth 2.0 / OIDC sunucusu, MIT
  - Grant tipi: `password` (dev/internal) + `refresh_token`
  - Client: `budget-tracker-dev` (appsettings'de ve seeder'da)
  - Scope: `openid profile email api`
  - Dev kullanıcı: `admin@tag.local` / `Devpass!2026` (`IdentitySeeder.DevDefaultPassword`)
- **JWT Bearer** — her API isteği `Authorization: Bearer …`
- Frontend axios interceptor'ı 401'de otomatik refresh
- Multi-tenant yetki: `user_companies` ve `user_segments` ile scope'lanır

---

## 7. Frontend Mimari Detayları

### State mimarisi

| Tür | Araç | Kullanım |
|---|---|---|
| Server state | TanStack Query | `/api/v1/*` çağrıları, cache, optimistic update |
| UI state | Zustand | `auth` (token, user), `appContext` (seçili şirket/yıl/senaryo) |
| Form state | React Hook Form (plan) | İleride büyük form'larda |
| URL state | React Router search params | Filtre, sıralama, tab |

### Tasarım sistemi

- **Kaynak doğru:** prototip `docs/FinOpsTur_Prototip.html` (yoksa son commit'teki haliyle)
- **Renk paleti** (`index.css` `@theme`):
  - Primary `#b50303` (Tur Assist kırmızı), container `#da291c`
  - Tertiary `#005b9f` (mavi vurgu)
  - Success `#006d3e`, Warning `#8a5300`, Error `#ba1a1a`
  - Surface `#f7f9fe`, container tonları `#f2f4f8` → `#e0e2e7`
- **Tipografi:** Inter (400–900), Material Symbols Outlined
- **Utility class'lar** (`styles/finopstur.css`): `card`, `card-tonal`, `chip-*`, `btn-*` (gradient primary), `ribbon-*`, `tbl` (segment/total/subtotal row varyantları), `progress-track`, `tab`, `kpi-tile`, `label-sm`, `input`, `select`, `nav-item`

### Route haritası

| Path | Sayfa | Rol |
|---|---|---|
| `/login` | LoginPage | public |
| `/` | DashboardPage | AuthGuard |
| `/budget/planning` | BudgetEntryPage | AuthGuard |
| `/actuals` | ActualsPage | AuthGuard |
| `/forecast` | ForecastPage | AuthGuard |
| `/variance` | VariancePage | AuthGuard |
| `/reports` | ReportsPage | AuthGuard |
| `/master-data` | MasterDataPage | AuthGuard |
| `/consolidation` | ConsolidationPage | AuthGuard |
| `/approvals` | ApprovalsPage | AuthGuard |
| `/audit` | AuditLogPage | AuthGuard |

---

## 8. Bilinen Tuzaklar & Hatırlatmalar

1. **EF + RLS etkileşimi** — EF connection pool'u GUC'ları kaybeder. Her request'te middleware + `TenantConnectionInterceptor` `SET LOCAL` basıyor.
2. **Background jobs** — Hangfire planlandı ama şu an koda girmedi. TCMB kurları manuel endpoint'tir; scheduler gelecek.
3. **Audit partition overflow** — 84 aydan eski partition drop edilecek (job henüz yok).
4. **Çift FX kolonu sync** — Bir tutar yazılırken `amount_try_fixed` ve `amount_try_spot` aynı işlemde hesaplanmalı (EF interceptor ya da domain service).
5. **OpenIddict migration sırası** — OpenIddict tabloları ayrı migration, ana domain migration'larından önce.
6. **In-memory SQLite test yasağı** — JSONB, RLS, partition desteklemez. Testcontainers + gerçek Postgres 16 zorunlu.
7. **AG Grid range paste yok** — Community lisans sınırı. Özel `useClipboardRange.ts` planlı.

---

## 9. Komut Şablonları

```bash
# Backend
dotnet build
dotnet test
dotnet run --project src/BudgetTracker.Api
dotnet ef migrations add <Name> \
  --project src/BudgetTracker.Infrastructure \
  --startup-project src/BudgetTracker.Api
dotnet ef database update \
  --project src/BudgetTracker.Infrastructure \
  --startup-project src/BudgetTracker.Api

# Frontend
cd client
pnpm install
pnpm dev          # Vite dev server — :3000 (host:true)
pnpm build
pnpm lint
pnpm exec playwright test

# Dev DB
docker compose -f docker-compose.dev.yml up -d
# Postgres :5435 · Seq :5341
```

---

## 10. Açık Referanslar

- ADR geçmişi → `docs/architecture.md`
- Codemap'ler → `docs/CODEMAPS/`
- CHANGELOG → `CHANGELOG.md`
- AI asistan kılavuzu → `CLAUDE.md`
- UI prototip (disc'te yoksa git history'den `docs/FinOpsTur_Prototip.html`)
