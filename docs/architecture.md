# Architecture Decision Records

Bu doküman BudgetTracker projesinin mimari kararlarını kronolojik olarak izler. Her ADR (Architecture Decision Record) bir kararın **bağlamını**, **seçimini**, **gerekçesini** ve **sonuçlarını** kayıt altına alır. Karar değişiklikleri yeni bir ADR ile yapılır; mevcut ADR'ler tarihsel kayıt olarak korunur.

---

## ADR-0001 — Başlangıç Stack ve Mimari Kararları

**Tarih:** 2026-04-15
**Statü:** Kabul edildi (FROZEN)
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- Master spec: `docs/BUTCE_TAKIP_YAZILIMI.md`
- 8 açık karar dondurma: `docs/plans/2026-04-15-acik-kararlar-design.md`
- UI/UX entegrasyon: `docs/plans/2026-04-15-ui-ux-entegrasyon-design.md`

### 1. Bağlam

Tur Assist Group (~2.25 Mrd TL yıllık ciro, ~20 finans/operasyon kullanıcısı, 5 segment) için bütçe takip ve varyans analizi yazılımı geliştirilecek. Master spec v2.0.0 oluşturuldu, §12'deki 8 açık karar 2026-04-15 brainstorming oturumunda dondurularak kapatıldı. S1 stage başlangıcında temel stack ve mimari ilkeler ADR olarak kayıt altına alınmalı.

### 2. Karar

#### 2.1. Backend Stack

| Bileşen | Seçim | Sürüm |
|---|---|---|
| Runtime | .NET LTS | **10.0** |
| Web framework | ASP.NET Core Web API | 10 |
| ORM | Entity Framework Core | 10 |
| Auth | ASP.NET Core Identity + **OpenIddict** (OIDC, MIT) | 6.x |
| Background jobs | Hangfire | 1.8.x |
| Logging | Serilog → Seq (dev), Sentry (prod) | latest |
| Validation | FluentValidation | 11.x |
| Mapping | Mapster | 7.x |
| Test | xUnit + FluentAssertions + **Testcontainers (Postgres 16)** | latest |

**.NET 10 seçim gerekçesi:**
- .NET 9 **STS**'tir (Standard Term Support) — destek **Mayıs 2026**'da biter (proje canlıya alınmadan)
- .NET 10 **LTS**'tir — **Kasım 2028**'e kadar destek garantisi
- .NET 10 SDK zaten dev makinesinde kurulu (`10.0.103`)
- EF Core 10 ve ASP.NET Core 10 olgunluk problemi yok; .NET 9'dan API breaking change minimal

**OpenIddict seçim gerekçesi:**
- Duende IdentityServer >1M USD ciro üstü ticari lisans gerektirir (~1.5K-12K USD/yıl) — Tur Assist Group eşiği aşıyor
- Keycloak ayrı servis çalıştırma yükü, küçük kullanıcı sayısı için orantısız
- OpenIddict MIT lisanslı, .NET 9 web service içinde tek process olarak çalışır
- Ayrıntı: bkz. Karar #5 — `docs/plans/2026-04-15-acik-kararlar-design.md`

#### 2.2. Veritabanı

| Bileşen | Seçim |
|---|---|
| RDBMS | **PostgreSQL 16** |
| Extensions | `pgcrypto`, `pg_stat_statements`, `pgaudit` (prod) |
| Migration | EF Core Migrations + raw SQL (RLS, partition, trigger) |
| Multi-tenancy | `company_id` kolonu + EF global query filter + **PostgreSQL RLS** (defense-in-depth) |
| Audit log | **Aylık partition**, append-only DB role, 7 yıl retention |
| Test DB | **Testcontainers** (gerçek Postgres 16 image — in-memory SQLite **YASAK**) |

**PostgreSQL gerekçesi:**
- JSONB (esnek `metadata` alanları), partial indexes, EXCLUDE constraints (bütçe versiyon tekilliği), RLS (multi-tenant izolasyon), partitioning (audit log) — hepsi tek üründe
- Açık kaynak, Railway native destek, .NET 10 + Npgsql 9 olgun

#### 2.3. Frontend Stack

| Bileşen | Seçim |
|---|---|
| Framework | **React 19** + Vite 6 + TypeScript 5.6+ |
| Styling | **Tailwind CSS 4** (CSS-first, OKLCH renkler) |
| State (server) | TanStack Query 5 |
| State (client) | Zustand 5 |
| Routing | React Router 7 |
| Forms | React Hook Form + Zod |
| Data grid | **AG-Grid Community** (MIT) + custom clipboard handler (range copy-paste) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Test | Vitest + Testing Library + **Playwright** (E2E) |
| Build | Vite |
| Package manager | pnpm |

**AG-Grid Community gerekçesi:**
- Enterprise sürümü ~1000 USD/dev/yıl, range copy-paste için fazla
- Handsontable ticari lisans gerekir
- Custom clipboard handler 2-3 gün iş; sprint maliyeti kabul edilebilir
- Ayrıntı: bkz. Karar #6

#### 2.4. Mimari Stil — Clean Architecture (4 katman)

```
src/
├── BudgetTracker.Api/             # Web API, controllers, middleware, DI composition
├── BudgetTracker.Application/     # Use cases, CQRS handlers, DTOs, validators
├── BudgetTracker.Core/            # Entities, value objects, domain events (no deps)
└── BudgetTracker.Infrastructure/  # EF DbContext, repositories, external adapters
```

**Bağımlılık yönü:** `Api → Application → Core ← Infrastructure → Application`

- `Core`: Hiçbir framework bağımlılığı yok (saf .NET, no EF, no ASP.NET)
- `Application`: Sadece `Core`'a bağımlı; arayüzler burada tanımlanır (`IUnitOfWork`, `IBudgetRepository`, `IErpAdapter`...)
- `Infrastructure`: `Application` arayüzlerini somutlaştırır (EF Core, Hangfire, OpenIddict, TCMB HTTP client)
- `Api`: Composition root, DI, middleware, controller endpoints

**Test stratejisi:**
- `Core`: %100 unit test (saf domain logic)
- `Application`: handler bazlı unit + integration test
- `Infrastructure`: Testcontainers ile gerçek Postgres üzerinde integration test
- `Api`: WebApplicationFactory + Testcontainers ile end-to-end API test

#### 2.5. Hosting — Railway (Frankfurt)

- Web service (.NET 10) + worker (Hangfire) + PostgreSQL 16
- TLS, otomatik backup, health check Railway tarafında
- Docker image portable — gerekirse Azure Turkey'e taşıma yolu açık
- KVKK notu: müşteri verisi kurumsal (şirket müvekkilleri); kişisel veri sadece ~20 sistem kullanıcısı (ad, e-posta, rol). Yurt dışı veri aktarımı VERBİS beyanı gerektirir, yasal engel yok.
- Ayrıntı: bkz. Karar #4

### 3. Day-1 Vazgeçilmezleri (NEGOTIATION CLOSED)

Aşağıdaki ilkeler MVP'nin **ilk satırından** itibaren uygulanır. Sonradan eklenmesi mümkün olmayan veya çok pahalı olan kararlar:

1. **Multi-tenant (`company_id`)** — Tek müşteri olsa bile her tabloda `company_id`. EF global query filter + Postgres RLS. Sonradan eklemek tüm sorguları yeniden yazmaktır.
2. **Bütçe versiyonlama** — `budget_versions` tablosu, state machine (`DRAFT → SUBMITTED → DEPT_APPROVED → FINANCE_APPROVED → CFO_APPROVED → ACTIVE`), `EXCLUDE` constraint ile aktif versiyon tekilliği.
3. **Onay workflow** — Bütçe versiyonu state machine'i + onay kayıtları. Excel'den gelmeyen, UI üzerinden disiplinli giriş.
4. **Çift para birimi raporlama** — Her tutar tablosunda 4 alan: `amount_original`, `currency_code`, `amount_try_fixed` (yıl başı TCMB), `amount_try_spot` (ay sonu TCMB). TCMB FX job (Hangfire, her gün 15:45 TR). Bkz. Karar #2.
5. **Audit log** — Aylık partition, append-only DB role, 7 yıl retention. Tüm CUD operasyonları otomatik kaydedilir (EF Core SaveChanges interceptor).
6. **Soft delete + versiyonlama** — Hiçbir kayıt fiziksel silinmez; `deleted_at` + `deleted_by_user_id`.
7. **Banker's rounding** — Tüm para hesaplamalarında `MidpointRounding.ToEven` (yuvarlama bias'ını sıfırlar).
8. **Test DB izolasyonu** — Testcontainers, in-memory SQLite **kullanılmaz** (Postgres-spesifik özellikler test edilemez: JSONB, RLS, EXCLUDE, partition).

### 4. Reddedilen Alternatifler

| Alternatif | Red gerekçesi |
|---|---|
| .NET 9 LTS | .NET 9 STS'tir; LTS .NET 10'dur |
| Duende IdentityServer | Ticari lisans (>1M USD ciro eşiği) |
| Keycloak | Ayrı servis ops yükü |
| Azure AD B2C | Vendor lock-in |
| MySQL / SQL Server | JSONB + RLS + EXCLUDE + partition tek üründe yok |
| In-memory SQLite (test) | Postgres-spesifik özellikler test edilemez |
| Vercel | .NET runtime yok, Hangfire desteği yok |
| Azure Turkey | Daha pahalı, daha karmaşık ops |
| Express + tRPC + MySQL (Manus AI önerisi) | Kullanıcı .NET ekosistemini seçti, Manus stack'i reddedildi |
| AG-Grid Enterprise | Lisans maliyeti, range copy-paste için fazla |
| Handsontable | Ticari lisans |

### 5. Sonuçlar

**Olumlu:**
- LTS sürümlerle uzun ömür (.NET 10 → 2028, PostgreSQL 16 → 2028)
- Açık kaynak / MIT lisanslar — sürpriz lisans maliyeti yok
- Clean Architecture + 4 katman → test edilebilirlik ve değiştirilebilirlik
- Day-1 ilkeleri sonradan refactor maliyetini ortadan kaldırır
- Railway → düşük ops yükü, kurumsal ölçeğe yetecek seviye

**Olumsuz / Risk:**
- AG-Grid range copy-paste custom handler 2-3 gün ek iş
- OpenIddict EF Core 10 desteği henüz çıkış aşamasında — migration sırasında dikkat
- Railway Frankfurt → Türkiye latency ~50-80ms (kabul edilebilir, dashboard uygulaması)
- TCMB XML feed format değişikliği riski → adapter ile soyutlanmalı, schema validation testi şart

### 6. İzleme

Bu ADR'nin değişimi yeni bir ADR ile yapılır. Etkilenebilecek alanlar:
- Stack sürüm yükseltmeleri (.NET 11, EF Core 11 vb.) → minor ADR
- Hosting değişikliği (Railway → Azure Turkey) → major ADR
- Auth provider değişikliği → major ADR

---

## ADR-0002 — EF Core 10 Persistans Katmanı, Multi-Tenancy ve RLS Stratejisi

**Tarih:** 2026-04-15
**Statü:** Kabul edildi
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0001 (stack)
- Master spec: `docs/BUTCE_TAKIP_YAZILIMI.md` §6 (veri modeli), §11 (KVKK / audit)

### 1. Bağlam

S2 sprintinde Day-1 multi-tenant şema (8 entity), audit log partition, tenant izolasyon (EF filter + Postgres RLS), bütçe versiyon tekilliği constraint'i ve bunları doğrulayan bir test pipeline'ı kurulmalıydı. EF Core 10 + Npgsql 10.0.1 + RLS kombinasyonunun pek çok iyi-bilinmeyen tuzağı var; ADR-0001 sadece "RLS kullanılacak" diyordu, somut yaklaşım netleşmemişti.

### 2. Karar

#### 2.1. Paket sürümleri (Central Package Management)

`Directory.Packages.props` ile pinlenen kritik sürümler:

| Paket | Sürüm | Not |
|---|---|---|
| Microsoft.EntityFrameworkCore | 10.0.6 | LTS |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.1 | EF Core 10 ile uyumlu (>= 10.0.4, < 11) |
| EFCore.NamingConventions | 10.0.1 | snake_case mapping |
| Testcontainers.PostgreSql | 4.11.0 | gerçek Postgres 16 image |
| FluentAssertions | **6.12.2** | 8.x Xceed ticari lisansa geçti, 6.12.2 son OSS sürüm — pinlendi |
| Respawn | 6.2.1 | test data reset |

CPM kullanımı: tüm proje csproj'leri sürüm vermeden `<PackageReference Include="..." />` yazıyor; tek doğru kaynak `Directory.Packages.props`.

#### 2.2. Tenant izolasyon — iki katmanlı

**Katman 1: EF global query filter** — `OnModelCreating` her `TenantEntity` türü için `e => e.CompanyId == _tenantContext.CurrentCompanyId || _tenantContext.BypassFilter` filter ekler. Hızlı ve EF tarafında SQL'e gömülür.

**Katman 2: PostgreSQL Row Level Security** — Defense-in-depth. Bir bug ya da `IgnoreQueryFilters()` yanlış kullanımı RLS'i bypass etmez. Tenant tabloları (`segments`, `expense_categories`, `budget_years`, `budget_versions`):

```sql
ALTER TABLE budget_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_years FORCE ROW LEVEL SECURITY;  -- table owner'ı bile bypass etmez
CREATE POLICY tenant_isolation ON budget_years
  USING      (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);
```

`NULLIF(...,'')::INT` deseni kritik: `current_setting(..., true)` GUC unset olduğunda `''` döner, doğrudan `::INT` cast 22P02 hatası fırlatır. `NULLIF` empty'yi NULL'a çevirir, `company_id = NULL` UNKNOWN → **default-deny**. (Postgres planner AND clauselarını yeniden sıralayabilir, bu yüzden eski `<> ''` guard'ı yetmez.)

#### 2.3. GUC'u her connection'a basma — `TenantConnectionInterceptor`

EF connection pool → her opened connection için `DbConnectionInterceptor.ConnectionOpenedAsync` tetikleniyor. Burada `SELECT set_config('app.current_company_id', @cid, false)` çalıştırılır. `is_local=false` çünkü pooled connection'lar transaction sınırlarını aşıyor; aksi halde GUC bir sonraki kullanıcıya sızabilirdi.

`AsyncLocal<TenantState>` tabanlı `TenantContext` request-scoped tenant'i takip eder; `BeginScope(companyId)` / `BeginBypassScope()` `IDisposable` döner, `using` ile kapatılır.

#### 2.4. Non-superuser uygulama rolü — `budget_app`

Postgres'te superuser RLS'i bypass eder. Dolayısıyla:
- Migration `budget_app` rolünü `NOSUPERUSER NOBYPASSRLS LOGIN` ile yaratır.
- DML grant'leri sadece domain tablolarına; `audit_logs` üzerinde **sadece INSERT + SELECT** (UPDATE/DELETE yok — append-only DB seviyesinde garanti edilir).
- Production deploy öncesi şifre rotation: `ALTER ROLE budget_app PASSWORD <secret>` ortam değişkeninden alınmalı. Migration'daki sabit `budget_app_dev_password` **sadece dev/test**.

#### 2.5. Audit log — aylık partition

`audit_logs` `PARTITION BY RANGE (created_at)`. Migration 2026-04 ve 2026-05 için iki başlangıç partition yaratır; üretimde `AuditPartitionMaintenanceJob` (Hangfire) her ay yeni partition açar ve 84 ay (7 yıl) öncesini drop eder. Index'ler her partition'a otomatik propagate olur.

EF tarafında `AuditLogEntry` normal `DbSet` olarak görünür; partition routing tamamen Postgres'in işi.

#### 2.6. Bütçe versiyon tekilliği — EXCLUDE constraint

```sql
ALTER TABLE budget_versions
  ADD CONSTRAINT uq_budget_versions_active_per_year
  EXCLUDE USING gist (
    company_id WITH =,
    budget_year_id WITH =
  )
  WHERE (is_active = true);
```

Bir `(company_id, budget_year_id)` için en fazla bir aktif versiyon. Application tarafında race condition olsa bile DB seviyesinde 23P01 fırlatır.

#### 2.7. Test stratejisi — Testcontainers + Respawn + iki connection string

- `PostgresContainerFixture` (`ICollectionFixture` — tüm test sınıfları tek container paylaşır, hızlı).
- Container ayağa kalkınca `dbContext.Database.MigrateAsync()` çalışır → tüm raw SQL (RLS, partition, seed, role) uygulanır.
- Respawn ile her test öncesi data reset (currencies/companies/segments/expense_categories ignore — seed verisidir).
- İki connection string açıklanır:
  - **Superuser** (postgres) → arrangement, RLS bypass eden seed.
  - **budget_app** → testin "act" fazı; RLS gerçekten enforce edilir.
- 6 baseline test: schema, seed, EXCLUDE constraint, RLS cross-tenant blok, RLS default-deny (GUC unset), audit partition routing.

### 3. Reddedilen Alternatifler

| Alternatif | Red gerekçesi |
|---|---|
| Sadece EF query filter | Bug/kötü niyet RLS olmadan tenant izolasyonu kıramaz; Day-1 ilkesi ihlali |
| Schema-per-tenant | 5 → N müşteri büyümesi migration cehennemi; cross-tenant raporlama zor |
| Database-per-tenant | Hangfire/Identity karmaşası; küçük ölçekte gereksiz ops |
| `current_setting('...', false)` (strict) | GUC unset → exception fırlatır; bypass scope job'larında kullanılamaz |
| Açık `is_null` + `<> ''` guard'lı policy | Postgres planner AND'i yeniden sıralayabilir, cast hata verir (gerçek bug — 22P02) |
| In-memory SQLite test | RLS, JSONB, EXCLUDE, partition desteklenmez |
| Test sınıfı başına container | ~10× yavaş, paralel docker yükü |
| Testcontainers olmadan dev DB'ye doğrudan test | Test izolasyonu yok, paralel CI çakışır |
| FluentAssertions 7+ / 8+ | Xceed ticari lisans (BUSL); 6.12.2 son MIT sürüm |

### 4. Sonuçlar

**Olumlu:**
- Multi-tenant izolasyon iki bağımsız katmanda kanıtlandı; birinin bug'ı diğerini düşürmez.
- Audit log Day-1'den partitioned; ilk üretim datasından sonra "şimdi partition'a alalım" yeniden yazımı yok.
- EXCLUDE constraint state machine bug'ını DB'de yakalar.
- Integration test pipeline 9 saniyede 6 testi gerçek Postgres üzerinde koşturuyor; CI'da kullanılabilir.
- CPM ile sürüm sürüklenme yok; ileride EF Core 11 yükseltme tek dosyada.

**Olumsuz / Risk:**
- `TenantConnectionInterceptor` her connection open'da bir extra round-trip → küçük latency; yüksek QPS'de pool tuning gerekebilir.
- `budget_app` rolü dev şifresi migration'da hardcoded — production deploy script'i ALTER ROLE çalıştırmalı (release checklist'e eklenecek).
- EF query filter + RLS aynı koşulu iki kez SQL'e gömüyor — planner'ın bunu eleyeceğine güveniyoruz; tersi prove edilirse query filter'lar gevşetilebilir.
- Testcontainers Docker bağımlılığı CI runner gereksinimi.

### 5. Açık aksiyonlar

- [ ] Production deploy script'i: `ALTER ROLE budget_app PASSWORD '${BUDGET_APP_DB_PASSWORD}'` (env var)
- [ ] `AuditPartitionMaintenanceJob` (Hangfire) — S6'da
- [ ] EF query filter + RLS plan analizi (k6 yük testi sırasında — S14)
- [ ] FluentAssertions OSS fork takibi; gerekirse Shouldly'e geçiş
- [ ] OpenIddict tabloları için ayrı migration (S3 — Identity) — ✅ ADR-0003

---

## ADR-0003 — Kimlik Doğrulama Katmanı (ASP.NET Identity + OpenIddict)

**Tarih:** 2026-04-15
**Statü:** Kabul edildi
**Karar Sahibi:** Timur Selçuk Turan

### 1. Bağlam

S3 sprintinde BudgetTracker'ın kimlik doğrulama + yetkilendirme katmanı kurulur. Gereksinimler:

- 5 rol hiyerarşisi (Admin, CFO, FinanceManager, DepartmentHead, Viewer) — master spec §4
- Çoklu kiracı: Her kullanıcı 1+ `companies` ile ilişkili; aktif şirket bir claim olarak token'a gömülmeli (tenant middleware bunu okur)
- OAuth2 + OpenID Connect — gelecek SSO entegrasyonu için
- Day-1'den SPA (React) + refresh token akışı
- Ticari lisans yasak: Duende IdentityServer eleniyor → açık kaynak (Apache-2.0) alternatif şart

### 2. Karar

**Identity:** ASP.NET Core Identity + `int` birincil anahtar (`IdentityUser<int>`, `IdentityRole<int>`).
**OpenIddict 7.4.0** ile OAuth2/OIDC server. Default string-keyed OpenIddict entity'leri kullanılıyor (Identity int, OpenIddict string ayrı tutuldu — karışım karmaşası yok).

**Ayar noktaları:**

| Konu | Karar |
|------|-------|
| Hashing | PBKDF2 (default, FIPS-compliant). Argon2id — S13+ yük testi sonrası değerlendirme. |
| MFA | Ertelendi (S11+). Şu an required değil, alt yapı `TwoFactorEnabled` field'ı ile hazır. |
| UserCompany | Day-1 many-to-many köprü (`user_companies` snake_case), `IsDefault` flag + `AssignedByUserId` audit. |
| Şemalar | İki ASP.NET Core auth scheme: **OpenIddict.Server.AspNetCore** (passthrough endpoint'leri için) ve **OpenIddict.Validation.AspNetCore** (genel API). Default = Validation. Cookie scheme sadece gelecek web UI authorization code + PKCE akışı için register edilmiş durumda. |
| Client seed | Development'ta `budget-tracker-dev` (public client) otomatik seed — `IdentitySeeder.SeedDevOAuthClientAsync`. Production'da migration'dan ayrı bir tool ile yaratılacak. |
| Dev keys | `AddDevelopmentEncryptionCertificate()` + `AddDevelopmentSigningCertificate()` — **sadece dev**. Production'da X509 sertifika secret store'dan yüklenecek. |
| Token ömürleri | Access 30 dk, refresh 14 gün. |

**Passthrough modu**, `/connect/token`, `/connect/userinfo`, `/connect/authorize`, `/connect/logout` endpoint'lerini OpenIddict server dispatcher'ın önce işleyip sonra MVC controller'a devretmesini sağlıyor — böylece özel claim + scope ekleme mantığı `AuthController` içinde kalıyor.

**`[Authorize]` şema çözümü:**
- **Genel API** (`AccountController.Register` gibi): `[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme, Policy = "Admin")]`.
- **Userinfo** endpoint'i (passthrough): `[Authorize]` yerine `HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme)` ile manuel kimlik doğrulama — server'ın zaten çözmüş olduğu principal doğrudan okunur. Bu pattern OpenIddict'in resmi örneğiyle uyumludur.

**Tenant bağlama:** `CreatePrincipalAsync` içinde `UserCompany.IsDefault` üzerinden default şirket seçilip `company_id` claim'i access + identity token'a basılıyor. `TenantResolutionMiddleware` bu claim'i okuyup `TenantContext.BeginScope` çağırıyor — böylece S2'deki RLS/EF query filter mekanizması değişmeden çalışıyor.

**Migration stratejisi:** OpenIddict + Identity tabloları `InitialSchema`'nın **üstünde** tek migration olarak eklenir (`AddIdentityAndOpenIddict`). Tablolara `budget_app` non-superuser role'ü için GRANT'lar migration sonunda raw SQL olarak çalışıyor.

### 3. Reddedilen Alternatifler

- **Duende IdentityServer:** Ticari lisans (>1M revenue sınırı aşıldı). Lisans riski kabul edilemez.
- **Auth0 / Azure AD B2C:** Dış bağımlılık, KVKK için veri yerelleştirme zorluğu, ek maliyet. Railway Frankfurt deploymentında self-hosted tercih edildi.
- **Custom JWT middleware (raw IdentityModel):** Token revoke, refresh rotation, consent akışı, device flow gibi özellikler elle yazılacaktı. Bakım yükü yüksek.
- **OpenIddict + int-keyed custom entities (`ReplaceDefaultEntities<int>`):** Entity tip çakışması ve migration karmaşası yaşandı (POC). Default string-keyed OpenIddict + int-keyed Identity karışımı daha temiz çıktı.
- **Argon2id Day-1:** PBKDF2 yeterli güvenlik ve daha az bağımlılık. Argon2 paketleri C interop ve CPU/RAM tuning gerektirir; S13+ yük testi sonrası değerlendirilecek.
- **MFA Day-1:** Kullanıcı tabanı ~20 kişi, iç ağ + VPN üzerinden erişim. Operasyonel hazır olmayı geciktirirdi; S11+'de TOTP eklenecek.

### 4. Sonuçlar

**Olumlu:**
- OpenIddict Apache-2.0 — lisans riski yok.
- Standards-compliant OAuth2 + OIDC → SPA refresh token akışı out-of-the-box.
- Token revoke + introspection + refresh rotation hazır; audit tarafı DB'de native.
- Identity password policy (12 karakter, lockout 5/15dk) KVKK için makul baseline.
- Day-1 UserCompany ilişkisi ileride kullanıcının birden fazla kiracıya atanmasını (ör. CFO birden fazla tüzel kişilik) tek değişiklikle destekliyor.

**Olumsuz / Risk:**
- Dev sertifikaları ephemeral — her restartta değişir, production'da kalıcı X509 şart. Release checklist'te.
- `budget-tracker-dev` client seed sadece dev'de çalışır; production client create script henüz yok (S15 release prep).
- OpenIddict sürümü güncellendiğinde migration path'ini kontrol etmek gerekebilir (5.x → 6.x arasında breaking change deneyimi mevcut).
- `[Authorize]` şema seçimi bilinçli yapılmalı; default scheme Validation, Server scheme passthrough controller'ları için elle belirtiliyor.

### 5. Açık aksiyonlar

- [ ] Production X509 sertifika (encryption + signing) — Railway secret store'dan yüklenecek (S15)
- [ ] Production `budget-tracker-spa` client create script (S15)
- [ ] Argon2id PoC + benchmark (S13 sonrası)
- [ ] MFA (TOTP) — `/connect/mfa` endpoint'leri (S11+)
- [ ] `ALTER ROLE budget_app PASSWORD` deploy step artık Identity + OpenIddict tabloları için de GRANT gerektiriyor — migration bunu hallediyor, deploy script'i sadece password rotate
- [ ] Audit log integration: login/logout/register olayları `AuditLog` tablosuna yazılmalı (S5 — audit partition)

---

## ADR Şablonu

Yeni ADR eklerken aşağıdaki şablonu kullan:

```markdown
## ADR-0004 — Domain Entity'ler, FX Dönüşüm ve KPI Hesaplama Motoru

**Tarih:** 2026-04-16
**Statü:** Kabul edildi
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- Master spec: `docs/BUTCE_TAKIP_YAZILIMI.md` (§3 Entity, §4 FX, §5.1 KPI)
- ADR-0002 (persistans katmanı, multi-tenant stratejisi)

### 1. Bağlam

S2'de kurulan altyapının üzerine bütçe domain entity'leri, çift FX sütun yapısı ve 16 KPI'lık performans hesaplama motoru eklenmeli. Master spec §3'teki entity modeli (Customer, BudgetEntry, ActualEntry, ExpenseEntry, SpecialItem, BudgetApproval, UserSegment) ve §5.1'deki KPI formülleri (Loss Ratio, Combined Ratio, EBITDA, Muallak Ratio vb.) hayata geçirilecek.

### 2. Karar

#### 2.1. Entity Tasarımı

- Her entity `TenantEntity` türevi (`CompanyId` + global query filter + RLS)
- Factory method pattern: `Create(...)` statik metodu ile oluşturma, constructor dışarıya kapalı
- `BudgetEntry` / `ActualEntry` / `ExpenseEntry`: çift FX sütunu (`AmountOriginal`, `CurrencyCode`, `AmountTryFixed`, `AmountTrySpot`)
- `BudgetApproval`: `Approve()` / `Reject()` metotları ile state guard (EnsurePending)
- `UserSegment`: basit POCO, composite PK (`UserId` + `SegmentId`)

#### 2.2. FX Dönüşüm Stratejisi

- Tek `CurrencyCode` yaklaşımı: tüm FX oranları kaynak → TRY implicit
- TRY passthrough: oran = 1, DB sorgusu yapılmaz
- Fixed rate: `IsYearStartFixed = true` olan kayıt, yoksa 1 Ocak öncesi en yakın oran
- Spot rate: ayın son gününe en yakın oran
- Banker's rounding: `Math.Round(value, 2, MidpointRounding.ToEven)`

#### 2.3. KPI Hesaplama Motoru

- `KpiCalculationEngine` — 16 KPI formülü + konsantrasyon analizi (HHI, TopN)
- Filtreleme: `versionId` (zorunlu), `segmentId` (opsiyonel), `MonthRange` (opsiyonel)
- Expense sınıflandırması: `ExpenseCategory.Classification` join ile gruplandırma (General/Technical/Financial)
- `SafeRatio()`: sıfıra bölme koruması, 4 ondalık banker's rounding
- `ConcentrationResult`: Herfindahl-Hirschman Index (HHI) = Σ(payᵢ²)

#### 2.4. Validation

- FluentValidation kullanımı: `CreateBudgetEntryRequestValidator`, `CreateCustomerRequestValidator`, `CreateExpenseEntryRequestValidator`, `CreateSpecialItemRequestValidator`
- Assembly tarama ile DI kaydı (`AddValidatorsFromAssemblyContaining`)

### 3. Reddedilen Alternatifler

| Alternatif | Reddedilme Nedeni |
|---|---|
| From/To FX çifti (`CurrencyFrom` + `CurrencyTo`) | Mevcut kullanım senaryosu tamamıyla kaynak → TRY; çapraz dönüşüm ihtiyacı yok. Gereksiz karmaşıklık. Gerektiğinde ADR ile genişletilir. |
| KPI hesaplamasını DB view/stored procedure ile yapmak | EF Core query composition yeterli; unit test'te mock DbSet ile test edilebilirlik avantajı. Domain logic C#'ta kalmalı. |
| MediatR pipeline ile KPI'ları handler'a sarma | Şu aşamada tek bir `CalculateAsync` çağrısı yeterli. CQRS handler ihtiyacı S5+ API endpoint'lerinde değerlendirilecek. |

### 4. Sonuçlar

**Olumlu:**
- 7 entity + 7 EF config + RLS policy ile tam multi-tenant domain modeli
- 77 unit test (tümü yeşil), golden scenario KPI doğrulaması dahil
- FluentValidation ile input boundary koruması
- FX dönüşüm servisi izole ve test edilebilir

**Olumsuz:**
- `ExpenseEntry` hem budget hem actual tipini taşıyor (`EntryType` enum); tablo büyüdükçe partition veya ayrı tablo düşünülmeli
- Cross-currency dönüşüm (ör. USD → EUR) desteklenmiyor — yalnız kaynak → TRY
- `SpecialItem.Month` nullable — yıllık bazda toplam kalem için `null`; raporlamada dikkat gerektirir

---

## ADR-0005 — API Controller Katmanı ve Endpoint Tasarımı

**Tarih:** 2026-04-16
**Statü:** Kabul edildi
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- Master spec: `docs/BUTCE_TAKIP_YAZILIMI.md` (§6 API Endpoint Referansı)
- ADR-0003 (Authentication), ADR-0004 (Domain + KPI)

### 1. Bağlam

S4'te oluşturulan domain entity'leri, servis katmanı ve KPI motoru için REST API endpoint'leri gerekiyor. Master spec §6'da 15 endpoint grubu tanımlı; bu ADR ilk 6 grubu (Customer, BudgetEntry, Expense, SpecialItem, Dashboard/KPI, BudgetVersion) kapsıyor.

### 2. Karar

#### 2.1. Controller Yapısı

- Her controller `[ApiController]` + `[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]`
- Yazma endpoint'leri ek `[Authorize(Policy = "...")]` ile rol bazlı koruma
- Route yapısı spec §6 ile uyumlu: `/api/v1/` prefix
- Controller'lar ince tutulur — iş mantığı servis katmanında

#### 2.2. Endpoint Kapsamı (S5)

| Controller | Route | Endpoint Sayısı |
|---|---|---|
| `CustomersController` | `/api/v1/customers` | 5 (CRUD) |
| `BudgetEntriesController` | `/api/v1/budget/versions/{versionId}/entries` | 4 (GET/POST/PUT bulk/DELETE) |
| `ExpenseEntriesController` | `/api/v1/expenses/{yearId}` | 3 (GET/POST/DELETE) |
| `SpecialItemsController` | `/api/v1/special-items/{yearId}` | 3 (GET/POST/DELETE) |
| `DashboardController` | `/api/v1/dashboard/{versionId}` | 2 (KPIs/TopCustomers) |
| `BudgetVersionsController` | `/api/v1/budget/` | 12 (years CRUD, versions CRUD, submit/approve/reject/archive) |

#### 2.3. Onay Akışı Endpoint'leri

- Submit: `POST /versions/{id}/submit` (Draft → Submitted)
- Dept Approve: `POST /versions/{id}/approve/dept`
- Finance Approve: `POST /versions/{id}/approve/finance`
- CFO Approve: `POST /versions/{id}/approve/cfo`
- Activate: `POST /versions/{id}/activate`
- Reject: `POST /versions/{id}/reject` (body: reason zorunlu)
- Archive: `POST /versions/{id}/archive`

Her adım ilgili role policy ile korunur. State machine doğrulaması domain entity'de yapılır.

#### 2.4. Kullanıcı Kimliği

- `ClaimTypes.NameIdentifier` → `userId` (int)
- `company_id` custom claim → `companyId` (TenantResolutionMiddleware tarafından scope'a bağlanır)

### 3. Reddedilen Alternatifler

| Alternatif | Reddedilme Nedeni |
|---|---|
| MediatR CQRS handler'ları | Mevcut ölçekte (6 controller, ~30 endpoint) overengineering. Servis katmanı yeterli. Controller → Service → DbContext akışı spec KURAL-002 ile uyumlu. |
| Minimal API | Controller pattern'ı OpenIddict auth scheme yönetimi, Swagger metadata ve route gruplandırma için daha uygun. Minimal API'ye geçiş gerekirse ayrı ADR ile. |
| Global exception filter | S5'te sadece InvalidOperationException fırlatılıyor. Production'da ProblemDetails middleware eklenecek (S6+). |

### 4. Sonuçlar

**Olumlu:**
- 29 endpoint, spec §6 ile uyumlu route yapısı
- Rol bazlı yetkilendirme (Admin, CFO, FinanceManager, DepartmentHead)
- Onay akışı tam state machine üzerinden işler
- KPI endpoint'leri segmentId ve monthRange filtresi destekler

**Olumsuz:**
- ProblemDetails / global exception handling henüz yok — InvalidOperationException 500 döner
- Validation pipeline (FluentValidation middleware) henüz API'ye bağlanmadı
- Variance, Scenario, Alert, Report, Import/Export, Admin endpoint'leri sonraki sprint'lere ertelendi

---

## ADR-0006 — API Hardening: Exception Handling, Validation Pipeline, TCMB Entegrasyonu

**Tarih:** 2026-04-16
**Statü:** Kabul edildi
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- Master spec: `docs/BUTCE_TAKIP_YAZILIMI.md` (§6.12 FX, §7 Güvenlik)
- ADR-0005 (API Controller Katmanı)

### 1. Bağlam

S5'te oluşturulan API controller'ları InvalidOperationException'ları 500 olarak dönüyordu, FluentValidation validator'ları DI'da kayıtlı ama API pipeline'ına bağlı değildi, ve TCMB kur çekme servisi eksikti.

### 2. Karar

#### 2.1. Global Exception Handler

- `IExceptionHandler` implementasyonu (ASP.NET Core 8+ native pattern)
- Exception tipi → HTTP status mapping:
  - `ArgumentException` → 422
  - `InvalidOperationException` ("not found") → 404
  - `InvalidOperationException` ("cannot be edited") → 409
  - `InvalidOperationException` (diğer) → 400
  - `UnauthorizedAccessException` → 403
  - Diğer → 500 (generic mesaj, stacktrace gizli)
- ProblemDetails RFC 9457 formatında response

#### 2.2. FluentValidation Pipeline

- `IAsyncActionFilter` olarak implement (MVC pipeline)
- Action argument'larını tarar, eşleşen `IValidator<T>` bulursa validate eder
- Hata durumunda `ValidationProblemDetails` ile 422 döner
- Controller kodunda manual validation gerekmez

#### 2.3. TCMB Kur Çekme Servisi

- `ITcmbFxService.SyncRatesAsync(DateOnly date)` — tek gün için kur çeker
- TCMB XML API: `https://www.tcmb.gov.tr/kurlar/{yyyyMM}/{ddMMyyyy}.xml`
- Takip edilen paralar: USD, EUR, GBP
- Mid-rate hesaplama: `(ForexBuying + ForexSelling) / 2` — banker's rounding 4 ondalık
- Idempotent: aynı tarih için tekrar çekmez
- HTTP hata toleransı: bağlantı hatası veya non-200 → 0 döner, exception fırlatmaz

#### 2.4. Ek Endpoint'ler

- `SegmentsController`: GET list + GET performance (KPI by segment)
- `FxRatesController`: GET rates (filtre: date/currency) + POST manual + POST sync (TCMB)

### 3. Reddedilen Alternatifler

| Alternatif | Reddedilme Nedeni |
|---|---|
| MVC `UseExceptionHandler` lambda | `IExceptionHandler` daha test edilebilir ve composable |
| FluentValidation.AspNetCore auto-validation | Paket .NET 8+ ile uyumsuz, deprecated. Manuel filter daha kontrollü. |
| TCMB verisi için third-party NuGet | Bakım riski, XML parse basit. Kendi implementasyonumuz daha güvenli. |

### 4. Sonuçlar

**Olumlu:**
- Tüm API hataları ProblemDetails formatında tutarlı response
- Validation hataları 422 ile alan bazlı detay döner
- TCMB kur çekme idempotent ve hata toleranslı
- 86 unit test, tümü yeşil

**Olumsuz:**
- Hangfire job henüz bağlanmadı — TCMB sync şimdilik sadece manuel endpoint ile
- Rate limiting henüz uygulanmadı

---

## ADR-0007 — Hangfire Dashboard, Seq Observability ve F1 Ertelenen İşler

**Tarih:** 2026-04-17
**Statü:** Kabul edildi (F2 kapanışı — commit b.k.z. `e539f6f` ve feat/f2-hangfire-seq-observability PR)
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0002 §5 (Hangfire açık aksiyonları)
- ADR-0003 §5 (OpenIddict dashboard auth'u)
- CHANGELOG.md "FAZ 1 — Operasyonel Kapanış" girdisi (kanıt kaydı)
- CLAUDE.md §Bilinen Tuzaklar #2 (Hangfire dashboard auth), #4 (TenantConnectionInterceptor sync-over-async)

### 1. Bağlam

F1 ("Operasyonel Kapanış") üç iş için Hangfire çekirdeği + 2 recurring job + TCMB silent-failure düzeltmesi + production X509/OIDC/DB rotation runbook'u teslim etti. Ancak dashboard UI, Seq sink ve F1 review ajanlarının yüksek önemli iki bulgusu (AuditLogger scoped context paylaşımı ve TenantConnectionInterceptor sync-over-async) bilinçli olarak bir sonraki faza bırakıldı.

F2 hem gözlemlenebilirlik katmanını ekliyor (dashboard + yapılandırılmış log + health check'ler) hem de F1 review ertelemelerini kapatıyor. Bu ADR her iki fazın birleşik karar kaydıdır.

Bu ADR **F2 başında Önerildi** statüsünde açılır ve kararlar kod yazılmadan belgelenir. Kod teslimi tamamlandığında ayrı bir commit ile "Kabul edildi" statüsüne güncellenir — git history'de karar tarihi koddan önce görünür.

### 2. Karar

#### 2.1. Hangfire Dashboard + OpenIddict Auth Filter

- `/hangfire` endpoint'i `UseHangfireDashboard()` ile açılır.
- `HangfireDashboardAuthorizationFilter` — JWT bearer token doğrular, `Admin` veya `Cfo` rolü gerektirir. Anonim 401, Viewer/Finance 403, Admin/Cfo 200.
- Default `LocalRequestsOnlyAuthorizationFilter` davranışı kaldırılır — Railway ortamında "local" anlamsız.

#### 2.2. Serilog + Seq Sink

- `Program.cs`'de `UseSerilog()` bootstrap logger ile değiştirilir.
- `appsettings.Development.json` — `Serilog:WriteTo` içinde Seq sink `http://seq:5341`. Aynı dosyada Console sink stdout fallback olarak kalır (Seq down → uygulama çöker değil, stdout'a devam eder).
- `appsettings.Production.json` **oluşturulmaz**. Railway ortamında Serilog konfigürasyonu env-var injection ile verilir (`Serilog__WriteTo__1__Args__serverUrl` + opsiyonel `apiKey`). Secret management disiplini F1 rotate-db-password.sh ile aynı: hiçbir prod secret repo'da tutulmaz.
- Dev `docker-compose.dev.yml` Seq container'ı: `datalust/seq:latest`, 5341 (ingest) + 8081 (UI).

#### 2.3. Structured Enricher'lar

`tenant_id`, `user_id`, `request_id` — her log event'ine otomatik eklenir. Seq UI'da filtre edilebilir.

**HttpContext yokluğu:** Hangfire recurring job'lar background thread'de çalışır ve `IHttpContextAccessor.HttpContext == null` olur. Enricher null-safe implement edilir:
- `HttpContext == null` → `tenant_id`, `user_id`, `request_id` properties log event'ine eklenmez (`null` olarak görünür veya tamamen atlanır).
- Alternatif etiket: `job_context` property'si `"hangfire"` değerini alır, böylece Seq filter'ında `job_context=hangfire` ile tüm background job log'ları izlenebilir.
- Enricher hiçbir ortamda exception fırlatmaz; yakalanan hata Serilog `SelfLog`'a düşer.

#### 2.4. PII Masking (Log-Only, Log-Only)

- Serilog `Destructure.ByTransforming` ile:
  - `User` → email `u***@tag.local` formatına
  - `AuditEvent.IpAddress` → son oktet `192.168.1.***` formatına
- **Kapsam: sadece Seq'e giden structured log output.** `audit_logs` tablosu ham IP ile kalır — KVKK "meşru menfaat" gerekçesi (güvenlik olayı analizi). F6 `docs/kvkk-uyum.md` içinde bu gerekçe hukuk tarafıyla belgelenecek.

#### 2.5. Health Checks

- `/health/live` — sadece process (mevcut davranış, değişmiyor).
- `/health/ready` — `DbContextCheck<ApplicationDbContext>` (F1'den mevcut) + yeni `HangfireStorageHealthCheck` (Hangfire monitoring API'sine ping).

#### 2.6. AuditLogger → IDbContextFactory Geçişi _(F1 ertelenen)_

- `services.AddDbContextFactory<ApplicationDbContext>()` eklenir.
- `AuditLogger` constructor'ı `IDbContextFactory<ApplicationDbContext>` alır; her `LogAsync` çağrısında kısa-ömürlü `CreateDbContextAsync()` açar, kullanır, kapatır.
- Sonuç: audit yazımı business `SaveChangesAsync` scope'u ile paylaşılmaz. Business transaction rollback olsa bile audit satırı korunur (append-only garanti).
- Integration test: "business SaveChanges patladı → audit satırı DB'de" kanıtı.

#### 2.7. TenantConnectionInterceptor Async Fix _(F1 ertelenen)_

- Mevcut `ConnectionOpened` (sync) override → `ConnectionOpenedAsync` (async) override'a taşınır.
- `.GetAwaiter().GetResult()` kaldırılır — ASP.NET Core sync context'te deadlock riski kapanır.
- Integration test: async yolun çalıştığı + RLS GUC'unun set edildiği doğrulanır.

### 3. Reddedilen Alternatifler

| Alternatif | Reddedilme Nedeni |
|---|---|
| Dashboard'u Basic Auth ile koru | İki auth katmanı karışır; mevcut OpenIddict JWT'yi kullanmak tutarlı. |
| Seq yerine Datadog/NewRelic | Maliyet + KVKK yurt içi/yurt dışı veri transferi sorunu. Self-hosted Seq Turkey Railway region'da kalır. |
| PII masking'i `audit_logs` tablosunda da uygula | Audit kaydı güvenlik olayı analizi için ham IP gerektirir; KVKK meşru menfaat gerekçesi F6'da belgelenecek. |
| `AuditLogger`'ı `Hangfire.Client`'a fire-and-forget | Audit yazımının kaybolma riski; DbContextFactory ile senkron ama izole yazım daha güvenli. |
| Interceptor'ı tümden kaldırıp `SET LOCAL` middleware | Connection pool'da session GUC kaybolması CLAUDE.md §Bilinen Tuzaklar #1'de belgelenmiş risk; interceptor mimari olarak doğru çözüm, sadece async'e taşınıyor. |

### 4. Sonuçlar

**Olumlu:**
- Operatör için dashboard + structured log = incident triage süresi düşer.
- F1 review HIGH bulguları kapatılır; audit append-only garantisi sağlamlaşır.
- Seq + Serilog konfigürasyonu Railway env ile yönetilir (F1 secret disiplini korunur).
- Background job log'ları HttpContext yokluğundan etkilenmez — crash yok.

**Olumsuz:**
- Dev ortamda `docker-compose up` artık Seq container'ını da başlatır (ek bellek tüketimi ~200 MB).
- `IDbContextFactory` geçişi `AuditLogger` testlerini güncelemeyi gerektirir (F1 integration testleri yeniden yazılır).

### 5. Teslim Kanıtı (F2 kapanışı)

| Kalem | Uygulama |
|---|---|
| §2.1 Dashboard + OpenIddict auth | `HangfireDashboardAuthorizationFilter` + `/hangfire` mount (anonim 401, wrong-role 403, Admin/Cfo 200) |
| §2.2 Serilog + Seq sink | `UseSerilog` + `appsettings.Development.json`; prod serverUrl Railway env |
| §2.3 Structured enricher'lar | `BudgetTrackerLogEnricher` — `tenant_id`, `user_id`, `request_id`, `job_context=hangfire`; null-safe, SelfLog'a düşer |
| §2.4 PII masking (log-only) | `PiiMaskingEnricher` — email + IPv4/IPv6; tip-bypass koruması (`***` sentinel) |
| §2.5 Health checks | `/health/live` + `/health/ready` (+ `HangfireStorageHealthCheck` async offload, stats sızdırmaz) |
| §2.6 AuditLogger → IDbContextFactory | `AddDbContextFactory<ApplicationDbContext>` (Singleton) + izolasyon integration testi |
| §2.7 TenantConnectionInterceptor async | Sync + async path ayrı ADO.NET komutları, exception yakalanıp connection kapatılıyor |

**Test kapsamı:** 128 unit + 19 integration = 147 yeşil (F1 sonu 110 → +37).

**Ertelenmiş hardening (F3+):** CSRF / SameSite=Strict, Serilog sink index fragility (kullanıcı Railway env pattern direktifi gereği korundu), exception message redaction.

---

## ADR-0008 — Excel/PDF Raporlama, Tenant Stream Limiti, Türkçe Font ve Import Concurrency Guard

**Tarih:** 2026-04-17
**Statü:** Kabul edildi — §2.1/§2.2/§2.3/§2.5 F3 kapanışı itibarıyla uygulandı ve test edildi. **§2.4 (Excel başlık dili) muhasebe ekibi yazılı teyidine koşullu kalmaya devam ediyor**; teyit gelinceye kadar Türkçe sabit başlıklar uygulamada kullanılıyor ancak karar kilitlenmemiştir.
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0002 (audit_logs partitioning — `import_errors` tablosu buradan bağımsız)
- ADR-0007 (observability — import audit event'leri Seq'e akacak)
- CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #5 (Excel şablon başlık dili)

### 1. Bağlam

F1 ve F2'de operasyonel çekirdek ve gözlemlenebilirlik teslim edildi. F3, mevcut `IExcelImportService`, `IExcelExportService`, `IPdfReportService` interface'lerini doldurarak muhasebe ekibinin günlük iş akışını (Excel şablon → bütçe yükleme, P&L/Varyans Excel rapor, yönetim PDF) karşılamalı.

F3 kapsamı tek bir karar yüzeyinde birleştirilir, çünkü beş alt-problem birbirine bağımlı:
1. Büyük Excel dosyaları tenant başına memory basıncı yaratır.
2. Muhasebe ekibi Türkçe karakterle çalışır; PDF/Excel çıktılarında ğ/ü/ş/ı/ç/ö doğruluğu zorunlu.
3. Import iki kez paralel çağrılırsa (hızlı tıklama, çift sekme) aynı tenant'ta yarış şartı olur.
4. Excel şablon başlık dili (TR sabit / EN alias / dual header) iş akışına bağlı bir karar — teknik değil.
5. F2 security-reviewer carry-over: exception mesajlarının connection string/secret sızdırma riski.

### 2. Karar

#### 2.1. Excel Engine: ClosedXML + Tenant Stream Limiti

- `ClosedXML 0.104.2` (F1 pin).
- **Tenant limiti:** per-upload max **50 000 satır** veya **10 MB**. Aşıldığında `422 UnprocessableEntity` + Türkçe mesaj + `IMPORT_REJECTED_LIMIT` audit event.
- Ön kontrol: `IFormFile.Length > 10 * 1024 * 1024` → stream açılmadan reddet.
- Post kontrol: `IXLWorksheet.LastRowUsed().RowNumber() > 50_000` → stream açıldı, DB'ye commit edilmeden reddet.
- Row-by-row enumeration (`IXLWorksheet.RowsUsed()`) tercih edilir; tüm workbook memory'de tutulmaz.

#### 2.2. PDF Engine: QuestPDF + Lato TTF Subset Embed

- `QuestPDF 2025.1.2` (F1 pin, MIT/Community).
- **Fontlar:** Lato-Regular + Lato-Bold TTF dosyaları `src/BudgetTracker.Infrastructure/Resources/Fonts/` altında `EmbeddedResource` olarak işaretli.
- `FontManager.RegisterFontFromEmbeddedResource(...)` Program.cs bootstrap sırasında çağrılır.
- Subset: QuestPDF 2025.x varsayılan olarak yalnızca render edilen glyph'leri embed eder. PDF hedef boyut < 200 KB (executive summary).
- Doğrulama: PdfPig ile integration testte ğ/ü/ş/ı/ç/ö byte-level varlığı assert edilir.

#### 2.3. Import Concurrency Guard: PostgreSQL Advisory Lock

- Problem: aynı tenant'ın iki paralel import commit'i → intermediate state tutarsız, çift audit event, son yazım kazanır.
- Çözüm: `pg_try_advisory_xact_lock(hash)` — transaction scope'lu exclusive lock.
  - `hash = hashtextextended('import:' || company_id::text || ':budget_entries', 0)`
  - Transaction bitince otomatik serbest kalır — manuel unlock yok.
- `IImportGuard.TryAcquireAsync(companyId, resource, ct)` → `false` ise `409 Conflict` + Türkçe mesaj ("Bu şirket için zaten bir yükleme devam ediyor, birkaç dakika sonra tekrar deneyin.").
- Redis/SemaphoreSlim reddedildi (§3).

#### 2.4. Excel Şablon Başlık Dili (KOŞULLU)

- **Teknik karar:** Türkçe sabit başlıklar — `Müşteri`, `Segment`, `Ocak`, `Şubat`, …, `Aralık`, `Toplam`.
- **Koşul:** Muhasebe ekibinden yazılı teyit alınmadan §2.4 "Kabul edildi" statüsüne geçirilmez. Teyit öncesi F3 teslimleri TR sabit başlıklarla gider; teyit gelmezse F4 frontend i18n framework ile TR/EN alias sistemine geçiş yapılır (cost: ~0.5 gün F4 içinde).

#### 2.5. Log Hijyeni (F2 Carry-over)

- `ExceptionMessageSanitizer` helper — 3 regex mask:
  - Npgsql connection fragmentleri (`Host=`, `Password=`, `Port=`, `Username=`)
  - Mutlak dosya yolları (`^/etc/`, `^/var/`, `^/home/`, `C:\`)
  - OpenIddict cert path/uzantıları (`.pfx`, `.key`)
- Uygulama noktaları: `Program.cs` `Log.Fatal(ex, ...)` + `GlobalExceptionHandler` → `ProblemDetails.Detail`.
- F2 security-reviewer LOW bulgusunu kapatır.

### 3. Reddedilen Alternatifler

| Alternatif | Red Nedeni |
|---|---|
| EPPlus (v5+) | Kommersiyal lisans; CLAUDE.md yasak. |
| OpenXML SDK doğrudan | Düşük seviye, F3 scope'u için overkill. Streaming gerekirse F8+'de değerlendirilir. |
| Redis distributed lock | CLAUDE.md Redis yasak. Advisory lock postgres-native, extra infra yok. |
| `SemaphoreSlim` in-memory | Multi-instance deploy'da işe yaramaz. |
| iTextSharp PDF | AGPL lisans; kommersiyal kullanım için paid. |
| Dual header (§2.4) | Okunabilirlik ve kolon genişliği sorunu. |
| TR/EN alias sistemi (§2.4) | F3 scope'unda complexity maliyet; F4 i18n ile entegre daha uygun. |

### 4. Sonuçlar

**Olumlu:**
- Muhasebe ekibi için Türkçe Excel şablonu → günlük iş akışı kesintisiz.
- Advisory lock → concurrency güvencesi, extra infra yok, multi-instance friendly.
- Lato TTF subset → PDF <200 KB, Türkçe glyph doğruluğu kanıtlı.
- Stream limiti → tenant bazlı DoS koruması, audit trail'de denetlenebilir.
- `ExceptionMessageSanitizer` → F2 carry-over kapanır.

**Olumsuz:**
- 50 000 satır üzerinde import isteyen bir tenant gelirse F8+'de streaming'e geçiş.
- Lato Regular + Bold embed infrastructure assembly'sini ~500 KB büyütür.
- §2.4 muhasebe teyidi gecikirse F4 i18n scope'u büyür.

**Koşullu:**
- §2.4 Excel başlık dili — muhasebe ekibinden yazılı teyit alınana kadar "Önerildi" kalır; diğer alt-kararlar (§2.1 / §2.2 / §2.3 / §2.5) F3 kapanışında "Kabul edildi"ye geçer.

### 5. Teslim Kanıtı (F3 kapanışı)

| Kalem | Uygulama | Test |
|---|---|---|
| §2.1 ClosedXML + tenant limiti | `ExcelImportService.PreviewAsync` / `CommitAsync`; `ImportLimits.MaxBytes = 10 MB`, `MaxRows = 50 000`; `ImportFileTooLargeException` → HTTP 422 | 5 integration (preview, commit, byte limit, year lock, concurrency) |
| §2.2 QuestPDF + Lato TTF subset | `QuestPdfFontBootstrap` + static ctor `PdfReportService`; embed via `EmbeddedResource`; KVKK footer satırı | 3 integration (generate <200 KB + Lato byte scan + source KVKK guard) |
| §2.3 Import concurrency guard | `IImportGuard` + `PgAdvisoryImportGuard` (`pg_try_advisory_xact_lock(hashtextextended(...))`); `ImportConcurrencyConflictException` → HTTP 409 | 6 integration (solo/contend/cross-tenant/cross-resource/auto-release/no-tx) |
| §2.4 Excel başlık dili (TR sabit) | `ExcelExportService`/`ExcelImportService` sabit `Müşteri`/`Ocak`…`Aralık`/`Toplam` | Kapsandı ancak karar muhasebe teyidine kadar koşullu |
| §2.5 Log hijyeni | `ExceptionMessageSanitizer` 4 regex mask + `GlobalExceptionHandler.Detail` entegrasyonu | 16 unit test (conn-string, POSIX path, Win path, cert ref, combined) |

**Test kapsamı:** F2 sonu 147 → F3 sonu **178** (+31 test). 144 unit + 34 integration, 0 fail.

**Muhasebe teyit bekleyen madde:**
- §2.4 — Türkçe sabit başlık listesi (`Müşteri`, `Segment`, `Ocak`…`Aralık`, `Toplam`). Muhasebe ekibi yazılı onay verdiğinde ADR bu not silinerek fully-accepted statüsüne geçecek; onay reddedilirse F4 SPA i18n framework ile TR/EN alias sistemine migrasyon (≈0.5 gün).

---

## ADR-0009 — Frontend Baseline: SPA Stack + OIDC PKCE + SameSite + i18n + §2.4 Finalize

**Tarih:** 2026-04-17
**Statü:** Önerildi (F4 kapanışında Kabul edildi'ye güncellenecek)
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0001 (stack — Chart.js vs Recharts sapması burada çözülür)
- ADR-0007 (Hangfire dashboard auth — SameSite kararı bu dashboard'u etkiler)
- ADR-0008 §2.4 (Excel başlık dili muhasebe koşullu — F4'te final'ize edilir)
- CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #5 (§2.4 ile aynı madde)

### 1. Bağlam

F1-F3 backend + operasyonel altyapıyı tesliım etti. `client/` dizini kısmen kurulmuş durumda (Vite + React 19 + Tailwind 4 + TanStack Query + Zustand + Chart.js + Router 7 paketleri pin'li, basic iskelet var). F4 bu iskeleti 6-sayfalık MVP'ye çevirir ve 4 bağımsız karar yüzeyini aynı anda kapatır:

1. SPA OIDC flow yönü (backend-redirect vs client-redirect)
2. Cookie `SameSite` davranışı (F2 carry-over güvenlik kararı)
3. i18n stratejisi (ADR-0008 §2.4 fallback altyapısı)
4. AG-Grid clipboard semantiği (Excel kullanıcı alışkanlığı kritik — CLAUDE.md Bilinen Tuzak #4)

Ek olarak ADR-0008 §2.4 muhasebe teyit yolu F4 içinde final'ize edilir; teyit gelirse ADR-0008 fully-accepted'a, gelmezse i18next migration'a.

### 2. Karar

#### 2.1. SPA Stack

Mevcut `client/package.json` üzerine şu eklemeler pin'lenir:
- AG-Grid Community 32+ — budget-entries spreadsheet UI
- React Hook Form + Zod — form validation
- date-fns — tarih biçimlendirme (TR locale)
- i18next + react-i18next — TR default + EN mirror
- Lucide React — ikon seti

ADR-0001'de "Recharts" olarak geçen frontend chart kütüphanesi burada resmi olarak **superseded**: Chart.js + react-chartjs-2 5.3 bağlayıcı (CLAUDE.md §Stack).

#### 2.2. OIDC Code + PKCE Flow (1A)

- SPA `/login` → `window.location.href = '/connect/authorize?...'` yönlendirir; OpenIddict cookie akışı + server-rendered consent sayfası kullanılır.
- Alternatif (1B — SPA programmatic redirect) reddedildi: PKCE akışının server-tarafında cookie+CSRF ile entegrasyonu basitleşiyor, SPA'da iki katmanlı auth state yönetimi gerekmez.
- Token interceptor `shared/api/http.ts` Axios instance'ına bağlanır; 401 → refresh attempt → fail ise `/login`; 403 → `/forbidden` route.

#### 2.3. i18n (2A — TR Default)

- Default dili Türkçe, EN mirror olarak destek; toggle kullanıcı ayarında.
- `shared/i18n/tr.json` primary, `shared/i18n/en.json` mirror.
- Key-count parity Vitest unit test — bir dosyada key eksikse build fail.
- Browser language detect (2B) reddedildi: kullanıcı tabanı homojen Türkçe.

#### 2.4. AG-Grid Clipboard Semantics (İnce Ayar #1)

- **AG-Grid Community** (Enterprise lisansı maliyeti gereksiz) + `useClipboardRange.ts` custom hook.
- Davranışlar:
  - Tek hücre kopya/yapıştır — native.
  - Contiguous range — native.
  - **Non-contiguous clipboard kopya** (Excel'de Ctrl+click ile birden fazla range seçilmiş) → **contiguous block olarak yapışır, seçili hücreden başlayarak**. Kullanıcı toast uyarısı: "Non-contiguous aralık contiguous olarak yapıştırıldı." — sessiz yapıştırma yok.
  - Dış kaynak kopya (Excel, Sheets) → hücre başına parse.
  - Read-only cells → yapıştırma atlanır + toast uyarısı.
  - Undo/redo — komut stack.
- Enterprise'a geçiş için rezerve tutulur; F8+'de kullanıcı ihtiyacı çıkarsa değerlendirilir.

#### 2.5. TR Locale Decimal Parse (İnce Ayar #2)

- **Açık Vitest assertion:** `"1.234,56"` → `1234.56` (JavaScript `Number`). Nokta binlik ayırıcı, virgül ondalık ayırıcı.
- Yanlış parse pathı (`parseFloat("1.234")` = 1.234 JS default) için regex-bazlı TR parser: önce virgül ondalık → nokta, binlik nokta silinir.
- Bankacılık doğruluğu açısından kritik — `decimal` round-trip testleri ExcelImportService TRY tutarlarıyla uyumlu kalmalı.
- `shared/lib/parseTrNumber.ts` helper + 10+ assertion Vitest testi (edge cases: negative, scientific notation, leading zero, trailing comma).

#### 2.6. SameSite=Strict Decision Flow (F2 Carry-over)

- `AuthenticationExtensions.AddCookie` → `SameSiteMode.Strict` denenir.
- E2E test (Playwright): `/connect/authorize` → SPA callback → token alma akışı Strict modda çalışıyor mu?
- **Çalışıyorsa**: Strict'e geçilir, `/hangfire` CSRF native korumalı.
- **Bozulursa**: Lax'ta kalınır + `/hangfire` için header-based double-submit CSRF token (SPA `X-CSRF-Token` header attığında sunucu cookie vs header eşleşme kontrolü). Gerekçe F4 PR açıklamasında + bu ADR §4 sonuçlarında belgelenir.

#### 2.7. Muhasebe §2.4 Teyit Deadline (2026-04-20 / Gün-3)

- F4 başlangıcı 2026-04-17. **Gün-3 son tarih: 2026-04-20**. Muhasebe ekibi yazılı teyit vermezse:
  - ADR-0008 §2.4 statü: "Reddedildi (i18next migration)"
  - `ExcelExportService` başlık satırı `i18next.t('budget.headers.customer')` pattern'ına geçer (~0.5 gün)
  - CLAUDE.md Açık Doğrulama #5 kapanır (reddedildi notu ile)
- Teyit gelirse:
  - ADR-0008 §2.4 "Fully Accepted" (koşul kalkar)
  - CLAUDE.md Açık Doğrulama #5 silinir (kabul notu ile)
  - ExcelExportService TR sabit başlık olarak kalır

### 3. Reddedilen Alternatifler

| Alternatif | Red Nedeni |
|---|---|
| 1B SPA programmatic redirect | İki katmanlı auth state yönetimi; server-rendered consent daha temiz |
| 2B Browser language detect | Homojen Türkçe kullanıcı tabanı; TR default yeterli |
| AG-Grid Enterprise | Lisans maliyeti gereksiz; Community + custom hook yeterli |
| Non-contiguous paste native desteği | AG-Grid Community sınırı; silent behavior yerine açık kullanıcı uyarısı seçildi |
| `parseFloat` direct TR string | Nokta binlik ayırıcıyı ondalık olarak yorumlar — bankacılık doğruluğu zarar görür |
| Recharts (ADR-0001) | CLAUDE.md §Stack Chart.js bağlayıcı; ADR-0001 §Frontend Chart Library superseded by ADR-0009 §2.1 |

### 4. Sonuçlar

**Olumlu:**
- 6 sayfalık MVP muhasebe ekibinin günlük iş akışını kapsıyor.
- AG-Grid + `useClipboardRange` Excel alışkanlığı ile uyumlu; non-contiguous edge case sessiz davranmıyor.
- i18next seed §2.4 teyit gecikse bile F4 Excel cephesini bloklamaz.
- SameSite kararı E2E test ile empirik olarak doğrulanır, ADR-based varsayım değildir.

**Olumsuz:**
- AG-Grid Enterprise olmadığı için büyük range paste senaryolarında kullanıcı uyarı toast'ı çıkar; UX ek adım.
- i18n mirror gün-3 teyidine kadar spekülatif iş; teyit gelirse bu kod yolu kullanılmaz (ölü kod riski). F4 sonunda değerlendirilir.
- Lighthouse ≥90 hedefi AG-Grid bundle size ile çekişebilir; chunked dynamic import gerekebilir.

**Koşullu:**
- §2.6 SameSite=Strict — Playwright E2E sonucu ile dallanır.
- §2.7 §2.4 muhasebe teyit — 2026-04-20 deadline.

---

## ADR-XXXX — [Başlık]

**Tarih:** YYYY-MM-DD
**Statü:** Önerildi | Kabul edildi | Reddedildi | Üst geçildi (ADR-YYYY tarafından)
**Karar Sahibi:** [İsim]

### 1. Bağlam
[Hangi problem, hangi kısıtlar]

### 2. Karar
[Ne yapılacak]

### 3. Reddedilen Alternatifler
[Hangi seçenekler değerlendirildi, neden reddedildi]

### 4. Sonuçlar
[Olumlu ve olumsuz etkiler]
```
