# Changelog

Bu dosya, BudgetTracker projesindeki tüm dikkate değer değişiklikleri kayıt altına alır. Format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ilkelerine, sürüm numaralama [Semantic Versioning](https://semver.org/) prensibine göredir.

## [Unreleased]

### S6 — API Hardening: Exception Handler, Validation Pipeline, TCMB (2026-04-16)

#### Eklendi

- **Global Exception Handler (`BudgetTracker.Api/Middleware`):**
  - `GlobalExceptionHandler` — `IExceptionHandler` implementasyonu
  - ProblemDetails RFC 9457 formatında hata response'ları
  - Exception → HTTP status mapping: ArgumentException→422, NotFound→404, Conflict→409, Generic→400, Unauthorized→403, Unhandled→500

- **FluentValidation Pipeline (`BudgetTracker.Api/Filters`):**
  - `FluentValidationFilter` — `IAsyncActionFilter` ile otomatik request validation
  - ValidationProblemDetails ile 422 response, alan bazlı hata detayı

- **TCMB Kur Çekme Servisi (`BudgetTracker.Infrastructure/FxRates`):**
  - `TcmbFxService` — TCMB XML API'den USD/EUR/GBP kur çekme
  - Mid-rate hesaplama (ForexBuying + ForexSelling / 2), banker's rounding
  - Idempotent (aynı tarih tekrar çekmez), HTTP hata toleranslı

- **Yeni Controller'lar:**
  - `SegmentsController` — GET list + GET /{id}/performance (segment bazlı KPI)
  - `FxRatesController` — GET rates (date/currency filtre), POST manual, POST sync (TCMB)

- **Testler (86 toplam, tümü yeşil):**
  - `GlobalExceptionHandlerTests` (6 test) — tüm exception→status mapping
  - `TcmbFxServiceTests` (3 test) — already synced, HTTP fail, XML parse

- **Dokümantasyon:**
  - `docs/architecture.md` — ADR-0006

### S5 — API Controller'ları: CRUD + Dashboard + Onay Akışı (2026-04-16)

#### Eklendi

- **API Controller'ları (`BudgetTracker.Api/Controllers`):**
  - `CustomersController` — 5 endpoint: GET list, GET by id, POST, PUT, DELETE
  - `BudgetEntriesController` — 4 endpoint: GET by version, POST, PUT bulk, DELETE
  - `ExpenseEntriesController` — 3 endpoint: GET entries, POST, DELETE
  - `SpecialItemsController` — 3 endpoint: GET, POST, DELETE
  - `DashboardController` — 2 endpoint: KPI kartları (segmentId + monthRange filtre), Top müşteriler (HHI)
  - `BudgetVersionsController` — 12 endpoint: years CRUD, versions CRUD, submit/approve(dept/finance/cfo)/activate/reject/archive

- **Servis implementasyonları (`BudgetTracker.Infrastructure/Services`):**
  - `ExpenseEntryService` — CRUD, FX dönüşüm, version lock guard
  - `SpecialItemService` — CRUD, version lock guard

- **DI güncellemeleri:**
  - Infrastructure: `ExpenseEntryService`, `SpecialItemService` kayıtları

- **Dokümantasyon:**
  - `docs/architecture.md` — ADR-0005 (API Controller Katmanı ve Endpoint Tasarımı)

#### Toplam Endpoint Sayısı: 29 (mevcut Auth/Account endpoint'leri hariç)

#### Bilinen Kısıtlar

- ProblemDetails / global exception handler henüz bağlanmadı — `InvalidOperationException` 500 döner
- FluentValidation pipeline API'ye entegre edilmedi — validator'lar DI'da kayıtlı ama middleware yok
- Variance, Scenario, Alert, Report, Import/Export, Admin endpoint'leri sonraki sprint'lere ertelendi

### S4 — Domain Entity'ler, Application Katmanı ve KPI Motoru (2026-04-16)

#### Eklendi

- **Domain entity'leri (`BudgetTracker.Core/Entities`):**
  - `Customer` — müşteri yönetimi, segment ilişkisi, soft-delete
  - `BudgetEntry` — bütçe kalemleri (Revenue/Claim), çift FX sütunu (`AmountTryFixed`, `AmountTrySpot`)
  - `ActualEntry` — gerçekleşen kalemler, ERP sync desteği (`ActualSource`)
  - `ExpenseEntry` — gider kalemleri (Budget/Actual), kategori bazlı sınıflandırma
  - `SpecialItem` — özel kalemler (MuallakHasar, DemoFilo, FinansalGelir, TKatilim, Amortisman)
  - `BudgetApproval` — onay akışı entity'si, `Approve()` / `Reject()` state guard
  - `UserSegment` — kullanıcı-segment yetkilendirme ilişkisi

- **Enum'lar (`BudgetTracker.Core/Enums`):**
  - `EntryType`, `ActualSource`, `SpecialItemType`, `ApprovalDecision`, `ApprovalStage`, `ExpenseEntryType`

- **EF konfigürasyonları + migration:**
  - 7 `IEntityTypeConfiguration<T>` — snake_case, decimal precision, FK Restrict, soft-delete filter
  - Migration `20260416044943_AddBudgetDomainEntities` — 7 tablo, CHECK constraints, RLS ENABLE+FORCE, `budget_app` role DML grants

- **Application DTOs + FluentValidation:**
  - `CustomerDto`, `BudgetEntryDto`, `ExpenseEntryDto`, `SpecialItemDto`, `BudgetApprovalDto`
  - Request DTO'ları + 4 FluentValidation validator
  - `BulkUpdateBudgetEntriesRequest` — toplu bütçe giriş desteği

- **FX dönüşüm servisi (`BudgetTracker.Infrastructure/FxRates`):**
  - `FxConversionService` — TRY passthrough, fixed rate (yıl başı), spot rate (ay sonu)
  - Banker's rounding (`MidpointRounding.ToEven`) tutarlılığı

- **Application servisleri:**
  - `BudgetEntryService` — CRUD + bulk upsert, version lock guard (Draft/Rejected), atomic FX dönüşüm
  - `CustomerService` — CRUD + soft-delete

- **KPI hesaplama motoru (`BudgetTracker.Application/Calculations`):**
  - 16 KPI formülü: LossRatio, ExpenseRatio, CombinedRatio, TechnicalProfit, NetProfit, EBITDA, EbitdaMargin, ProfitRatio, MuallakRatio vb.
  - Konsantrasyon analizi: HHI (Herfindahl-Hirschman Index), TopN müşteri payı
  - Filtreleme: versionId + opsiyonel segmentId + opsiyonel MonthRange

- **DI wiring:**
  - `AddApplication()` extension — FluentValidation assembly scan + KpiCalculationEngine
  - Infrastructure DI — `FxConversionService`, `CustomerService`, `BudgetEntryService` kayıtları

- **Testler (77 toplam, tümü yeşil):**
  - `CustomerTests` (7), `BudgetEntryTests` (6), `BudgetApprovalTests` (8), `ExpenseEntryTests` (5), `SpecialItemTests` (6)
  - `FxConversionServiceTests` (5), `KpiCalculationEngineTests` (4)
  - Golden scenario: spec §5.1 referans değerleriyle KPI doğrulaması

- **Dokümantasyon:**
  - `docs/architecture.md` — ADR-0004 (Domain Entity'ler, FX Dönüşüm, KPI Motoru)

### S3 — Kimlik Doğrulama: ASP.NET Identity + OpenIddict (2026-04-15)

#### Eklendi

- **Identity katmanı (`BudgetTracker.Infrastructure/Identity`):**
  - `User` (int key, `IdentityUser<int>` türevi, `DisplayName`, `CreatedAt`, `LastLoginAt`, `IsActive`)
  - `Role` (`IdentityRole<int>` türevi) + `RoleNames` sabitleri (Admin, CFO, FinanceManager, DepartmentHead, Viewer)
  - `UserCompany` — kullanıcı ↔ şirket many-to-many, `IsDefault` bayrağı, `AssignedAt`
  - `ApplicationDbContext` — `IdentityDbContext<User, Role, int>` türevi, OpenIddict varsayılan string-keyed entity tabloları (`UseOpenIddict()`)
  - `IdentitySeeder` — 5 rol + dev admin kullanıcısı (`admin@tag.local`) + 1 OAuth client (`budget-tracker-dev`, password + refresh_token + authorization_code + PKCE)
  - PBKDF2 default hasher (Argon2id S11'e ertelendi), MFA S13'e ertelendi

- **Authentication modülü (`BudgetTracker.Infrastructure/Authentication`):**
  - `AuthenticationExtensions` — Identity + OpenIddict server + validation wiring, dev certificates (ephemeral), password + refresh_token + authorization_code flows, `api` scope, audience `budget-tracker-api`
  - `BudgetTrackerClaims` — `company_id` özel claim adı
  - `TenantResolutionMiddleware` — bearer içindeki `company_id` claim'ini okuyup `ITenantContext.BeginScope` ile request kapsamına bağlar
  - Authorization policies — 5 rol için `Admin`, `Cfo`, `FinanceManager`, `DepartmentHead`, `Viewer` + composite (`RequireFinanceRole` vb.)

- **API endpoints (`BudgetTracker.Api/Controllers`):**
  - `AuthController`:
    - `POST /connect/token` — password grant + refresh_token grant, `CreatePrincipalAsync` ile sıfırdan `ClaimsIdentity` kurar, roller + `company_id` claim'i + destination map (AccessToken / IdentityToken)
    - `GET /connect/userinfo` — passthrough scheme nedeniyle manuel `HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme)`, id/email/displayName/roles/companies/activeCompanyId döner
  - `AccountController`:
    - `POST /api/v1/account/register` — `[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults..., Policy = "Admin")]` ile korumalı, kullanıcı + rol ataması + varsayılan `UserCompany` kaydı oluşturur

- **EF migration `20260415XXXX_AddIdentityAndOpenIddict`:**
  - ASP.NET Identity tabloları (`asp_net_users`, `asp_net_roles`, `asp_net_user_roles`, ...) + `user_companies` + OpenIddict default tabloları
  - `budget_app` rolüne SELECT/INSERT/UPDATE/DELETE grant'leri

- **Dokümantasyon:**
  - `docs/architecture.md` — **ADR-0003** (Kimlik Doğrulama Katmanı)
  - `docs/CODEMAPS/infrastructure.md` — Identity + Authentication klasör haritası

#### Karar

- Tek `ApplicationDbContext` (int-keyed Identity + string-keyed OpenIddict defaultları aynı context'te)
- Dual auth scheme: `OpenIddictValidation` varsayılan (API endpoint'leri için), `OpenIddictServer` passthrough (`/connect/*` için)
- `[Authorize]` üzerinde scheme'i **açıkça belirtme** zorunlu — default scheme resolution OpenIddict Validation handler'ını 403 ID2095 ile kısa devre yapabiliyor
- userinfo gibi Server passthrough endpoint'lerinde `[Authorize]` yerine manuel `HttpContext.AuthenticateAsync(ServerScheme)`

#### Bilinen Kısıtlar

- Dev sertifikaları ephemeral — production X509 sertifikası + secret store entegrasyonu S11'de
- `budget-tracker-dev` client yalnız seeder'a özel; production client seed script'i ayrıca hazırlanacak
- Auth event'leri (login success/fail, token issue, register) audit log'a bağlanmadı — S5'te `AuditLogEntry` append job'u ile
- MFA (TOTP) S13'e, Argon2id PoC S11'e ertelendi

#### Doğrulama

- Smoke test: `POST /connect/token` → 200 (access/refresh/id token) → `GET /connect/userinfo` → 200 → `POST /api/v1/account/register` → 200
- Tüm mevcut testler (29 unit + 6 integration) yeşil kalmaya devam ediyor

### S2 — EF Core 10 Persistans Katmanı + Day-1 Multi-Tenancy (2026-04-15)

#### Eklendi

- **Domain modeli (`BudgetTracker.Core`):**
  - 8 entity: `Company`, `Currency`, `FxRate`, `Segment`, `ExpenseCategory`, `BudgetYear`, `BudgetVersion`, `AuditLogEntry`
  - `Money` value object — banker's rounding (`MidpointRounding.ToEven`), aritmetik operatörler, currency mismatch koruması
  - `BaseEntity` (audit alanları), `TenantEntity` (`CompanyId`)
  - `ITenantContext` arayüzü — `CurrentCompanyId`, `BypassFilter`
  - Enums: `BudgetVersionStatus` (8 değer state machine), `ExpenseClassification` (TECHNICAL/GENERAL/FINANCIAL/EXTRAORDINARY), `FxRateSource` (TCMB/Manual/ECB)
  - `BudgetVersion` state machine: Draft → Submitted → DeptApproved → FinanceApproved → CfoApproved → Active (+ Reject, Archive)

- **Application abstractions (`BudgetTracker.Application`):**
  - `IApplicationDbContext` — 8 entity için `DbSet<T>` exposure + `IUnitOfWork` inheritance
  - `IClock`, `ICurrentUser`, `IUnitOfWork`

- **Infrastructure (`BudgetTracker.Infrastructure`):**
  - `ApplicationDbContext` — EF Core 10, snake_case naming convention, soft-delete query filter, tenant query filter
  - 8 `IEntityTypeConfiguration<T>` — decimal precision, FK relations, unique indexes, CHECK constraint hazırlığı
  - `TenantContext` — `AsyncLocal<TenantState>` tabanlı, `BeginScope` / `BeginBypassScope` `IDisposable` pattern
  - `TenantConnectionInterceptor` — `DbConnectionInterceptor` ile her opened connection'da `set_config('app.current_company_id', ..., false)` çağrısı
  - `EnumToStringConverter` — PascalCase ↔ SCREAMING_SNAKE_CASE eşlemesi (DB CHECK constraint ile uyumlu)
  - `DesignTimeDbContextFactory` — `dotnet ef migrations` CLI için
  - `SystemClock`, `AddInfrastructure` DI extension

- **Migration `20260415045722_InitialSchema`:**
  - 8 tablo, `pgcrypto` + `btree_gist` extension yükleme
  - `budget_app` non-superuser application role (`NOSUPERUSER NOBYPASSRLS`)
  - Bütçe versiyon tekilliği — `EXCLUDE USING gist` constraint
  - `audit_logs` partition table (`PARTITION BY RANGE (created_at)`) + 2 başlangıç partition (2026-04, 2026-05)
  - 4 tenant tablosunda **RLS ENABLE + FORCE** + `tenant_isolation` policy (`NULLIF(...,'')::INT` deseni — default-deny)
  - Domain tablolarında DML grants; `audit_logs` üzerinde sadece INSERT/SELECT (append-only)
  - CHECK constraints: `expense_categories.classification`, `budget_versions.status`, `fx_rates.source`, `fx_rates.rate > 0`
  - Seed data: 3 currency (TRY/USD/EUR), 1 company (TAG), 5 segment, 9 expense category

- **Api composition root (`BudgetTracker.Api`):**
  - `Program.cs` — `AddInfrastructure`, `AddDbContextCheck<ApplicationDbContext>`
  - `/health/live` (liveness, DB bağımlılığı yok) ve `/health/ready` (DB ping)
  - Template `WeatherForecast` artefaktları silindi

- **Test pipeline:**
  - `BudgetTracker.UnitTests` — `MoneyTests` (13 test, banker's rounding teorisi dahil) + `BudgetVersionStateMachineTests` (16 test) → **29 yeşil**
  - `BudgetTracker.IntegrationTests` — `PostgresContainerFixture` (Testcontainers + Respawn, collection-shared), iki connection string (superuser + budget_app), 6 baseline test:
    1. `Migration_CreatesAllExpectedTables`
    2. `Migration_SeedsBaselineCurrenciesAndSegments`
    3. `BudgetVersions_ExcludeConstraint_BlocksSecondActiveForSameYear`
    4. `RowLevelSecurity_BlocksCrossTenantReads_WhenUsingBudgetAppRole`
    5. `RowLevelSecurity_DefaultDeny_WhenGucIsUnset`
    6. `AuditLogs_PartitionRouting_PlacesRowInCorrectMonthlyChild`
  - **35/35 test yeşil** (unit + integration)

- **Build / paket altyapısı:**
  - `Directory.Packages.props` — Central Package Management
  - EF Core 10.0.6, Npgsql 10.0.1, FluentAssertions 6.12.2 (8.x Xceed lisansı nedeniyle pin), Testcontainers 4.11.0

- **Dokümantasyon:**
  - `docs/architecture.md` — ADR-0002 (EF Core 10 + RLS + multi-tenancy stratejisi)
  - `docs/CODEMAPS/infrastructure.md` (yeni)

#### Değiştirildi

- `docker-compose.dev.yml` postgres host port: `5432` → `5435` (host'ta diğer postgres servisleri çakışıyordu)
- `appsettings.Development.json` connection string yeni porta güncellendi
- `DesignTimeDbContextFactory` connection string yeni porta güncellendi

### S1 — Repo iskeleti (2026-04-15)

#### Eklendi

- 4 katmanlı solution iskeleti (`Api`, `Application`, `Core`, `Infrastructure`)
- `BudgetTracker.slnx`, `Directory.Packages.props`
- `docker-compose.dev.yml` (postgres 16 + seq)
- `infra/postgres/init/01-extensions.sql`
- `CLAUDE.md`, `docs/BUTCE_TAKIP_YAZILIMI.md` (master spec), `docs/architecture.md` (ADR-0001)
- `.gitignore`
