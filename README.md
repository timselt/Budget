# FinOps Tur

Tur Assist Grubu için çoklu kiracılı, KVKK uyumlu bütçe planlama ve performans takip platformu. Excel tabanlı mevcut akışın yerini alır.

> **Mimari otoriter kaynaklar:**
> - `CLAUDE.md` — stack + Day-1 prensipleri (dondurulmuş)
> - `docs/TECH_STACK.md` — teknoloji + mimari genel bakış
> - `docs/architecture.md` — ADR-0001 → ADR-0011 karar geçmişi
> - `docs/MIGRATION_PLAN.md` — fazların yol haritası + kabul kriterleri
> - `docs/BUDGET_WORKFLOW.md` — güncel bütçe yönetim akışı + rol bazlı kullanım
> - `CHANGELOG.md` — her PR için teslim kaydı

## Hızlı Başlangıç (< 10 dk)

### Ön koşullar

- .NET SDK 10
- Node.js 22 + pnpm 9
- Docker Desktop (Postgres 16 + Seq)

### Geliştirme ortamı

```bash
# 1) Veritabanı + observability stack (Postgres 16 + Seq)
docker compose -f docker-compose.dev.yml up -d

# 2) Schema migration
dotnet ef database update \
  --project src/BudgetTracker.Infrastructure \
  --startup-project src/BudgetTracker.Api

# 3) API (Terminal 1)
dotnet run --project src/BudgetTracker.Api
# → http://localhost:5100
# → /hangfire (Admin rol), /health/live, /health/ready
# → Seq: http://localhost:5341

# 4) SPA (Terminal 2)
cd client
pnpm install
pnpm dev
# → http://localhost:3000
```

### Tek komutlu dev akışı

```bash
# API + SPA + migration + docker stack
bash scripts/dev-up.sh

# Süreçleri kapat
bash scripts/dev-down.sh

# Docker stack'i de kapat
bash scripts/dev-down.sh --with-docker
```

### Dev login

`Development` environment'ı `IdentitySeeder` ile 5 test kullanıcısı seed eder (hepsinin şifresi `Devpass!2026`):

| E-posta | Rol |
|---|---|
| `admin@tag.local` | Admin (tüm yetkiler) |
| `cfo@tag.local` | Cfo |
| `finance@tag.local` | FinanceManager |
| `dept@tag.local` | DepartmentHead |
| `viewer@tag.local` | Viewer |

### Staging / production login

Fresh DB → kullanıcı yok. `--seed-bootstrap-admin` flag'i ilk Admin'i yaratır:

```bash
railway run --service api --environment staging \
  --env BOOTSTRAP_ADMIN_EMAIL=admin@finopstur.com \
  --env BOOTSTRAP_ADMIN_PASSWORD="$(openssl rand -base64 24)" \
  dotnet BudgetTracker.Api.dll --seed-bootstrap-admin
```

Detay: `infra/release/README.md` §1b + `docs/deployment-setup-guide.md` Adım 7.5.

### Testler

```bash
# Backend
dotnet test                                          # 179 test (unit + integration)
dotnet test --filter Category=GoldenScenario         # regression gate

# Client
cd client
pnpm test                                            # 48 Vitest
pnpm e2e                                             # 3 Playwright smoke
pnpm build                                           # TypeScript strict + Vite
```

## Stack (Dondurulmuş)

| Katman | Teknoloji |
|---|---|
| Backend | .NET 10 + ASP.NET Core + EF Core 10 + OpenIddict 7.4 + Hangfire |
| DB | PostgreSQL 16 (Testcontainers ile gerçek) |
| Observability | Serilog + Seq (structured log, PII mask) |
| Reports | ClosedXML (Excel), QuestPDF + Lato TTF (PDF) |
| Frontend | React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind 4 |
| State | Zustand (UI) + TanStack Query (server) |
| Grid | AG-Grid Community 32 + `useClipboardRange` hook |
| Charts | Chart.js 4.4 + react-chartjs-2 5.3 |
| i18n | i18next 24 (TR default, EN mirror) |
| Testing | xUnit + NSubstitute + Testcontainers / Vitest + jsdom / Playwright |
| Hosting | Railway (Frankfurt) |

## Mimari Prensipler (Day-1)

1. **Multi-tenant Day-1** — her tabloda `company_id`, EF query filter + PostgreSQL RLS (FORCE) + `budget_app` non-superuser rol
2. **Bütçe versiyonlama Day-1** — `budget_versions` + state machine + `EXCLUDE USING gist`
3. **Çoklu para birimi Day-1** — 4 FX kolonu (`amount_original` + `amount_try_fixed` + `amount_try_spot` + `currency_code`), TCMB Hangfire job 15:45 TR
4. **Audit log Day-1** — aylık partition, INSERT-only rol, 7 yıl retention (84 ay)
5. **Approval workflow Day-1** — Draft → PendingFinance → PendingCfo → Active
6. **Clean Architecture** — `Api / Application / Core / Infrastructure` 4 katman

## Bütçe Yönetim Akışı

Sistemde bütçe yönetimi "yıl + versiyon + onay" modeliyle yürür:

1. Finans yeni bütçe yılını açar.
2. O yıl için bir `Draft` versiyon oluşturur.
3. Gelir, gider, senaryo ve özel kalem çalışmaları bu taslak üzerinde yapılır.
4. Taslak tamamlanınca versiyon `PendingFinance` durumuna gönderilir.
5. Finans kontrolü sonrası versiyon `PendingCfo` durumuna geçer.
6. CFO onayı ile versiyon `Active` olur.
7. Aynı yıldaki eski aktif versiyon varsa otomatik `Archived` olur.
8. Aktif bütçede değişiklik gerekirse `Create Revision` ile yeni bir taslak açılır ve akış tekrar başlar.

Notlar:
- Sadece `Draft` ve `Rejected` versiyonlar düzenlenebilir.
- `Rejected` versiyonlar düzeltilip tekrar onaya gönderilebilir.
- "Geçen yıldan kopyala" işlemi kaynak olarak ilgili yılın `Active` versiyonunu kullanır.

## Release Akışı

Prod release adım adım: `infra/release/README.md`

1. Migration: `dotnet ef database update`
2. `infra/release/rotate-db-password.sh` (ALTER ROLE budget_app)
3. `dotnet BudgetTracker.Api.dll --seed-prod-oidc-client` (bir kereye mahsus)
4. X509 sertifikaları Railway volume mount'ta
5. Servisi deploy et

## CI

`.github/workflows/ci.yml` — her PR için:
- Backend build + unit test + integration test (coverage)
- Client lint + build + Vitest + Playwright smoke
- NuGet + npm security audit (high+ CVE block)

`main`'e merge sonrası ek: **Golden Scenario** regression gate (`Category=GoldenScenario`).

## Lisans + Açık Kaynak

Lato fontu OFL 1.1 (`src/BudgetTracker.Infrastructure/Resources/Fonts/OFL.txt`). Diğer bağımlılıklar MIT/Apache-2.0 (Hangfire, OpenIddict, QuestPDF Community, AG-Grid Community).

## İletişim

Geliştirme notları için `CHANGELOG.md`. Açık sorular `CLAUDE.md §Açık Doğrulama Bekleyen Maddeler`. Mimari karar isteklisi `docs/architecture.md` + yeni ADR açın.
