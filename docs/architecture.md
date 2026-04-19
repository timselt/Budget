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
2. **Bütçe versiyonlama** — `budget_versions` tablosu, state machine (`Draft → PendingFinance → PendingCfo → Active`; yardımcı durumlar: `Rejected`, `Archived`), `EXCLUDE` constraint ile aktif versiyon tekilliği.
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

- Submit: `POST /versions/{id}/submit` (`Draft` veya `Rejected` → `PendingFinance`)
- Finance Approve: `POST /versions/{id}/approve-finance` (`PendingFinance` → `PendingCfo`)
- CFO Approve + Activate: `POST /versions/{id}/approve-cfo-activate` (`PendingCfo` → `Active`)
- Reject: `POST /versions/{id}/reject` (`PendingFinance` veya `PendingCfo` → `Rejected`, body: reason zorunlu)
- Archive: `POST /versions/{id}/archive` (`Active` → `Archived`)
- Create Revision: `POST /versions/{id}/create-revision` (`Active` → yeni `Draft`)

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
**Statü:** Kabul edildi (tüm alt-kararlar). §2.4 için muhasebe ekibinin yazılı teyidi **2026-04-17 tarihinde alındı**: Türkçe sabit başlıklar onaylandı — koşul kaldırıldı.
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0002 (audit_logs partitioning — `import_errors` tablosu buradan bağımsız)
- ADR-0007 (observability — import audit event'leri Seq'e akacak)
- ~~CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #5~~ _(2026-04-17 kapandı — muhasebe onayı)_

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
| §2.4 Excel başlık dili (TR sabit) | `ExcelExportService`/`ExcelImportService` sabit `Müşteri`/`Ocak`…`Aralık`/`Toplam` | **Muhasebe teyidi 2026-04-17'de alındı — Fully Accepted.** |
| §2.5 Log hijyeni | `ExceptionMessageSanitizer` 4 regex mask + `GlobalExceptionHandler.Detail` entegrasyonu | 16 unit test (conn-string, POSIX path, Win path, cert ref, combined) |

**Test kapsamı:** F2 sonu 147 → F3 sonu **178** (+31 test). 144 unit + 34 integration, 0 fail.

**Muhasebe teyit durumu:** _(2026-04-17 kapandı — onaylandı)_
- §2.4 Türkçe sabit başlık listesi muhasebe ekibinden yazılı onay aldı. ADR fully-accepted statüsüne geçti; i18next migration iptal edildi. `ExcelExportService` mevcut sabit Türkçe başlıklarla kalır.

---

## ADR-0009 — Frontend Baseline: SPA Stack + OIDC PKCE + SameSite + i18n + §2.4 Finalize

**Tarih:** 2026-04-17
**Statü:** Kabul edildi (F4 kapanışı 2026-04-17). §2.6 SameSite kararı: Lax'ta kalındı; Strict geçişi F8+ güvenlik hardening fazına (ADR-0011 ile birlikte) ertelendi — cross-process E2E probe F5'te empirik olarak doğrulanacak.
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

#### 2.2. OIDC Password Grant (F4 Part 2'de korundu; PKCE code flow migration F8+'a ertelendi)

- **Revize edildi (2026-04-17, F4 Part 2 başlangıcı):** F4 Part 1 keşif sonrası mevcut `client/src/lib/api.ts` + `client/src/stores/auth.ts` SPA'nın halihazırda **OpenIddict password grant** (`grant_type=password` + `grant_type=refresh_token`) kullandığı görüldü. Mevcut akış production-safe ve iç araç kullanım senaryosunda (CFO + muhasebe ekibi) kabul edilebilir; PKCE code flow'a geçiş **büyük bir SPA refactor** olup F4 bütçesini önemli ölçüde genişletir.
- **Karar:** Password grant F4 Part 2'de korunur. LoginPage email/password form → POST `/connect/token` akışı değişmez. F4 Part 2 yalnızca eksik olanları tamamlar: (a) 401 refresh zaten mevcut, (b) **403 forbidden redirect eklendi** (`lib/api.ts` axios interceptor), (c) `shared/` pattern'ine opsiyonel re-export (F4 Part 1 minimal refactor direktifi gereği).
- **Code + PKCE migration** ayrı bir ADR (ADR-0011 aday konu, F8+ "Güvenlik Hardening") ile planlanır. Mevcut flow'un riski: password grant + localStorage access/refresh token → XSS durumunda token çalınabilir. F2 CSP + input sanitization ile kısmen azaltılır; iç araç + authenticated kullanıcı tabanı → risk kabul edilebilir.
- **Alternatif (1A `/connect/authorize` redirect + PKCE)**: Önerildi, F4 scope bütçesiyle uyumsuz bulundu; F8+ güvenlik hardening fazına ertelendi.
- **Alternatif (1B SPA programmatic PKCE)**: Red kararı geçerliliğini korur (iki katmanlı auth state).

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

#### 2.7. Muhasebe §2.4 Teyit — _KAPANDI 2026-04-17 (onaylandı)_

- Muhasebe ekibi Türkçe sabit başlıkları yazılı olarak onayladı (F4 Gün-0'da teyit geldi — deadline (2026-04-20) beklenmeden).
- ADR-0008 §2.4 "Fully Accepted"; `ExcelExportService` TR sabit başlıklarla kalır.
- CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #5 kapatıldı.
- i18n seed (tr.json + en.json) F4 foundation commit'inde teslim edildi; ExcelExportService bu seed'e bağlanmıyor (ölü kod değil — gelecek EN locale taleplerine hazır altyapı).
- F4 içindeki i18next migration iş paketi (Task #9) iptal edildi.

### 3. Reddedilen Alternatifler

| Alternatif | Red Nedeni |
|---|---|
| 1A `/connect/authorize` + PKCE (F4 Part 2 önerisi) | F4 Part 2 bütçesi dışında; password grant mevcut ve çalışır. PKCE migration F8+ güvenlik hardening (ADR-0011 aday) |
| 1B SPA programmatic PKCE | İki katmanlı auth state yönetimi |
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
- i18n seed altyapısı (tr.json + en.json) muhasebe onayı sonrası ExcelExportService tarafından tüketilmiyor; gelecek EN locale taleplerine hazır dokümantasyon altyapısı olarak korundu.
- Lighthouse ≥90 hedefi AG-Grid bundle size ile çekişebilir; chunked dynamic import gerekebilir.

**Koşullu:** _(her ikisi F4 kapanışında kapandı)_
- ~~§2.6 SameSite=Strict — Playwright E2E sonucu ile dallanır~~ — **Lax'ta kalındı** (F4 Part 2c Playwright smoke harness kuruldu; cross-process SameSite probe F5'e ertelendi). Strict geçişi ADR-0011 PKCE migration ile birlikte F8+'da ele alınır.
- ~~§2.7 §2.4 muhasebe teyit — 2026-04-20 deadline~~ _(2026-04-17 kapandı — onaylandı)_

### 5. Teslim Kanıtı (F4 kapanışı)

| Kalem | Uygulama | Test |
|---|---|---|
| §2.1 SPA stack additions | `client/package.json` — AG-Grid Community 32.3.3, RHF 7.54, Zod 3.24, date-fns 4.1, i18next 24.2, lucide-react, sonner 2.0, Vitest 2.1, Playwright 1.59 | `pnpm build` yeşil (TS strict); app bundle 112 KB gzip, BudgetEntryPage chunk 234 KB gzip |
| §2.2 OIDC flow (revize) | Password grant korundu; 403 → `/forbidden` axios interceptor | ADR-0011 aday açıldı (PKCE F8+) |
| §2.3 i18n TR default + EN mirror | `shared/i18n/tr.json` + `en.json` + key-parity Vitest | 2 test |
| §2.4 AG-Grid clipboard (ince ayar #1) | `BudgetGrid.tsx` + `useClipboardRange` + `parseClipboardGrid` + sonner toast | 15 Vitest (10 senaryo + 3 DoS + 2 parity) + 3 Playwright smoke |
| §2.5 TR decimal parse (ince ayar #2) | `parseTrNumber.ts` | 26 Vitest (canonical + regression guard + en-US reject + edge) |
| §2.6 SameSite (Lax korundu) | `AuthenticationExtensions.AddCookie` mevcut Lax; Strict F8+'da | F5 cross-process probe planlandı |
| §2.7 §2.4 muhasebe teyit | 2026-04-17 onay alındı | ADR-0008 §2.4 Fully Accepted |

**Toplam test kapsamı F4 sonu:** 178 backend + 48 client Vitest + 3 Playwright = **229**. F3 sonu 178 → +51.

---

## ADR-0011 — OIDC Password Grant → Authorization Code + PKCE Migration (Aday)

**Tarih:** 2026-04-17
**Statü:** Önerildi (F8+ güvenlik hardening fazında değerlendirilir)
**Karar Sahibi:** Timur Selçuk Turan
**İlgili Belgeler:**
- ADR-0003 (Identity + OpenIddict — mevcut server-side yapılandırma `AllowAuthorizationCodeFlow()` + `RequireProofKeyForCodeExchange()` zaten kayıtlı)
- ADR-0009 §2.2 (F4 Part 2'de password grant korundu — bu ADR'nin doğuş nedeni)
- CLAUDE.md §Stack (OpenIddict 7.4.0)

### 1. Bağlam

F4 Part 2 keşfinde SPA'nın OpenIddict password grant (`grant_type=password` + refresh_token) kullandığı görüldü. Mevcut akış iç araç kullanım senaryosunda çalışır ve F4 Part 2 bütçesinde kalır; ancak modern SPA best practice **authorization code + PKCE** üç tehditi kapatır:

1. **Password exposure** — kullanıcı parolası SPA'ya form ile gönderiliyor. SPA kodunda XSS veya supply-chain risk → parolaya doğrudan erişim. PKCE akışında parola yalnızca server-rendered consent sayfasında alınır, SPA parolayı asla görmez.
2. **localStorage token storage** — access + refresh token `localStorage`'da. XSS payload'ı token'ları çalabilir. PKCE + httpOnly cookie token'ı DOM erişiminden izole eder.
3. **RFC 8252 uyumluluğu** — native + SPA uygulamalar için OAuth 2.0 best practice PKCE zorunlu kılıyor; password grant "deprecated" olarak işaretlenmiş.

Migration maliyeti:
- SPA: LoginPage form → `/connect/authorize` redirect; callback handler + code exchange; token storage modeli değişir (cookie vs localStorage).
- Backend: OpenIddict zaten PKCE destekliyor (`AuthenticationExtensions.AddServer` içinde `AllowAuthorizationCodeFlow()` + `RequireProofKeyForCodeExchange()` kayıtlı); ek DI/middleware gerekmez. Refresh token rotation politikası gözden geçirilir.
- Test etkisi: auth store testleri + mevcut client Vitest'in login path'i yeniden yazılır.

### 2. Karar

**Önerilen:** Password grant → PKCE code flow migration **F8+ Güvenlik Hardening fazında** uygulanır.

F4 Part 2'de uygulanmama gerekçesi: F4 bütçesinin önemli kısmını (~1 gün) tek bir auth refactor'una ayırmak, aynı fazdaki AG-Grid entegrasyonu, Playwright harness ve Cookie SameSite kararını erteler. Password grant iç araç için kabul edilebilir güvenlik seviyesinde; riski F2 CSP + F4 Part 2 SameSite kararı azaltır.

### 3. Reddedilen Alternatifler

| Alternatif | Red Nedeni |
|---|---|
| Mevcut password grant'ı kalıcı bırakma | Modern SPA güvenlik best practice ile çelişir; audit + uyum süreçlerinde soru işareti yaratır |
| F4 Part 2'ye migration'ı sığdırma | Fazın diğer iş paketlerini (AG-Grid, E2E, SameSite) erteler; tek fazda çoklu breaking change riski |
| Implicit flow | OAuth 2.0 BCP 210 tarafından "don't do this" olarak işaretlendi |

### 4. Sonuçlar

**Olumlu (migration sonrası):**
- SPA parolaya erişmez; XSS → credential theft vektörü kapanır.
- Token httpOnly cookie'de → DOM erişiminden izole.
- RFC 8252 uyumlu; güvenlik denetimi pozitif geri bildirim.

**Olumsuz (migration maliyeti):**
- SPA login flow yeniden yazım (~1 gün).
- Test senaryoları (client Vitest'in bir kısmı + E2E login akışı) güncellenir.
- Redirect-based flow bazı dev-tooling'e ek adım ekler.

**Koşullu:**
- F8+ fazı başlamadan önce F4-F7'nin ürettiği bundle size + Lighthouse kararları stabilize olmuş olmalı.

---

## ADR-0012 — Expense Kategori + Adjustment Domain Bucket Uyumlama (Aday)

**Tarih:** 2026-04-18
**Statü:** Önerildi (muhasebe seansı sonrası karara bağlanacak)
**Karar Sahibi:** Timur Turan + muhasebe ekibi (CFO seansı)

### 1. Bağlam

`docs/reference/butce_schema_v1.sql` (Excel "Bütçe 2026.xlsx" türevi PostgreSQL DDL) ile mevcut `BudgetTracker.Core` domain modeli arasında iki noktada **semantik bucket farkı** tespit edildi (`docs/schema-mapping.md` §3.2).

**1.1 Expense kategori seed eksikliği**

| Kaynak | Kategori sayısı | Seed listesi |
|---|---|---|
| Schema | 17 | PERSONEL, SEYAHAT, SIRKET_GENEL, IT, PAZARLAMA, DANISMANLIK, AGIRLAMA, ARAC, ARAC_TURFILO, KONUT_KONFOR, FINANSMAN, HOLDING, DIGER_OLAGAN, FINANSAL_GELIR, T_KATILIM, AMORTISMAN, YATIRIM |
| Mevcut (`InitialSchema` migration) | 9 | PERSONEL, SIRKET_GENEL, IT, ARAC, FINANSMAN, HOLDING, DIGER, FINANSAL_GELIR, AMORTISMAN |

Eksik 8 kategori: `SEYAHAT, PAZARLAMA, DANISMANLIK, AGIRLAMA, ARAC_TURFILO, KONUT_KONFOR, DIGER_OLAGAN, T_KATILIM, YATIRIM`. Mevcut seed'deki `DIGER` kategorisi schema'daki `DIGER_OLAGAN`'a karşılık geliyor olabilir (isim drift) — doğrulanmalı.

**1.2 SpecialItem ↔ adjustment_entries semantik çakışması**

| | Schema (`adjustment_type_enum`) | Mevcut (`SpecialItemType`) |
|---|---|---|
| 1 | IADE | MuallakHasar |
| 2 | TURFILO_PROVIZYON | DemoFilo |
| 3 | MUALLAK_KAYDI | FinansalGelir |
| 4 | MUALLAK_HESAPLAMA_DISI | TKatilim |
| 5 | — | Amortisman |

- Schema'nın "adjustment" kavramı **yalnızca sigorta hasar düzeltmeleri** (iade, provizyon, muallak ayrımı).
- Mevcut "SpecialItem" kavramı hem sigorta-spesifik (Muallak/DemoFilo) hem de **genel finansal kalemler** (FinansalGelir, TKatilim, Amortisman) içeriyor.
- Schema'da bu son üç kalem `expense_categories` tablosunda (FINANSAL_GELIR, T_KATILIM, AMORTISMAN); mevcut'ta `SpecialItem` tablosunda. **Aynı veri farklı domain bucket'larında**.
- Schema'daki MUALLAK_KAYDI vs MUALLAK_HESAPLAMA_DISI ayrımı mevcut'ta yok (tek `MuallakHasar`).
- Schema'daki IADE mevcut'ta hiç yok.

### 2. Karar (Karara Bağlanacak — Muhasebe Seansı)

Üç olası yön:

**Seçenek A — Schema domain ayrımına refactor (muhasebe-uyumlu)**
- `SpecialItemType` 4 değere indirilir: `IADE, TURFILO_PROVIZYON, MUALLAK_KAYDI, MUALLAK_HESAPLAMA_DISI`.
- Mevcut `FinansalGelir / TKatilim / Amortisman` SpecialItem kayıtları `ExpenseEntry` altına taşınır (data migration: yeni `ExpenseCategory` satırları + ETL).
- `expense_categories` seed eksik 8 kalemle tamamlanır.
- **Sonuç:** Schema ile birebir uyum, muhasebe terminolojisi.

**Seçenek B — Mevcut domain ayrımını koru**
- `SpecialItemType` 5 değer kalır.
- Schema sadece referans, eşleşmeyen kavramlar `docs/schema-mapping.md`'de açıklanmış halde tutulur.
- Eksik 8 expense kategori sadece muhasebe doğrularsa eklenir.
- **Sonuç:** Migration overhead yok, ama schema ↔ kod terminoloji ayrı kalır.

**Seçenek C — Hibrit: kategori tamamla + SpecialItem'ı koru**
- `expense_categories` seed eksik 8 kalemle tamamlanır.
- `SpecialItemType` 5 değer kalır (kavramsal ayrımı muhasebe ile teyit ettikten sonra).
- IADE, TURFILO_PROVIZYON, MUALLAK_KAYDI, MUALLAK_HESAPLAMA_DISI domain'de gerekli mi sorgulanır.
- **Sonuç:** Düşük risk, kademeli uyumlama.

### 3. Reddedilen Alternatifler

- **Tüm SpecialItem'ları kaldır + her şeyi `ExpenseEntry`'ye taşı:** Mevcut MuallakHasar/DemoFilo davranışı sigorta hasar düzeltmesi (negatif/pozitif yön + muallak hesaplama dışı bırakılabilirlik) — bunu generic expense tablosunda modellemek query karmaşıklığı yaratır.
- **Schema'yı tamamen göz ardı et:** Excel formül zinciri kaynağı (O63, O127, O145 vs.) regression fixture için kritik — kanonik referans olarak kalmalı.

### 4. Sonuçlar

**Pozitif (Seçenek A veya C):**
- Muhasebe ekibi ile aynı dilden konuşma.
- Excel modeli ile bire bir aritmetik doğrulama (regression fixture daha sıkı).
- 17 kategori uzun vadede dashboard kategori chip'leri ve raporlama gruplaması için zenginlik.

**Negatif (Seçenek A):**
- Data migration karmaşası (mevcut SpecialItem kayıtları ExpenseEntry'ye port).
- API contract değişikliği (frontend SpecialItem endpoint'leri etkilenebilir).
- Geçiş dönemi backward compatibility shim'i gerekebilir.

**Negatif (Seçenek B):**
- Schema vs kod terminoloji farkı süreklilik kazanır → onboarding'de karışıklık.
- Excel-türevi yeni domain ihtiyaçları (örn. IADE) ortaya çıkarsa ayrı entity gerekir.

### 5. Eylem Maddeleri (Karar Öncesi)

- [ ] Muhasebe ekibinden eksik 8 expense kategori için doğrulama (her satırın `ExpenseClassification` mapping'i ile)
- [ ] Muhasebe ekibinden adjustment kavram ayrımı doğrulaması (IADE / TURFILO_PROVIZYON / MUALLAK_KAYDI vs MUALLAK_HESAPLAMA_DISI domain'de gerçekten ayrı kalemler mi?)
- [ ] FinansalGelir / TKatilim / Amortisman'ın muhasebe açısından "expense kategori" mi yoksa "özel kalem" mi olduğu netleştirilmeli
- [ ] Karar sonrası bu ADR statüsü "Kabul edildi" olarak güncellenecek + uygulama ADR'ı (data migration planı dahil) yazılacak

---

## ADR-0013 — Product Domain: ProductCategory + Product + CustomerProduct + BudgetEntry.ProductId

**Tarih:** 2026-04-18
**Statü:** Kabul edildi — backend + tests + ProductsPage frontend shipped 2026-04-18
  (commits 389e493, b70b79a, bu commit). Seed + CustomersPage matrix + BudgetEntry
  mock kaldırma muhasebe ekibinin ürün listesi onayına bağlı (bkz. §6).
**Karar Sahibi:** Timur Turan + muhasebe/operasyon ekibi

### 1. Bağlam

Mevcut domain müşteri seviyesinde duruyor: `Segment` (kategori) → `Customer` → `BudgetEntry (CustomerId × Month × Revenue/Claim)`. Timur'un 2026-04-18 tarihli bütçe yönetimi anlatımı ise **ürün kırılımı** gerektiriyor:

> Kategori → Müşteri → [Ürün Kategorisi → Ürün] → Müşteri-Ürün bağı → aylık tutar.

Örnek: *İkame Araç* ürün kategorisi altında `3x2 gün`, `5x3 gün`, `7x5 gün` gibi teminat varyasyonları; *Yol Yardım* altında farklı kapsam paketleri; *Konut* altında ayrı teminat kırılımları. Bir müşteri (örn. Anadolu Sigorta) bu ürün kataloğundan **sadece kendi sözleşmesinde olan ürünleri** kullanıyor, komisyon oranı ürün bazında değişebiliyor, bütçe kalemi her müşteri×**ürün**×ay için girilebilir olmalı.

Şu anki durum:
- **Backend:** `Product`, `ProductCategory`, `CustomerProduct` entity yok (grep sıfır eşleşme). `BudgetEntry.ProductId` alanı yok.
- **Frontend:** `BudgetEntryPage.tsx` içinde 6 satırlık `CUSTOMER_PRODUCTS` mock dizisi (Oto Asistans - LifeStyle / Standart Paket, Eksper Hizmeti, Sağlık Asistans, Mini Onarım, İkame Araç); `CustomersPage.tsx` "Müşteri × Ürün Matrisi" sekmesi yine mock `MATRIX_ROWS` ile dolu. Ürün yönetim ekranı yok.

Bu ADR ürün domain'inin DB + Core + Application + API + UI katmanlarında uçtan uca eklenmesini tasarlar. `ExpenseCategory`/`SpecialItem` ile birleştirme kararı ADR-0012'nin kapsamında kaldığı için buradan ayrıdır; sadece **satış tarafı (gelir/hasar)** ürün kırılımı ele alınır.

### 2. Karar — Önerilen Domain Modeli

#### 2.1 Yeni Entity'ler (Core)

```
ProductCategory : TenantEntity
  - Id (SERIAL)
  - CompanyId (FK → companies)
  - Code (VARCHAR 30, UNIQUE per CompanyId)
  - Name (VARCHAR 150)
  - Description (TEXT, nullable)
  - DisplayOrder (SMALLINT)
  - IsActive (BOOL)
  - audit alanları (CreatedAt/By, UpdatedAt/By, DeletedAt/By)
  - Opsiyonel: SegmentId (FK → segments, nullable) — bir ürün kategorisi
    sadece belirli müşteri kategorilerinde anlamlı olabilir (örn. "İkame
    Araç" sadece Otomotiv/Filo). Null ise tüm segmentlerde geçerli.
  - Unique index: (CompanyId, Code) WHERE DeletedAt IS NULL

Product : TenantEntity
  - Id (SERIAL)
  - CompanyId (FK → companies)
  - ProductCategoryId (FK → product_categories)
  - Code (VARCHAR 30, UNIQUE per CompanyId)
  - Name (VARCHAR 200)
  - Description (TEXT, nullable)
  - CoverageTerms (JSONB, nullable) — teminat parametreleri için esnek alan
    (ör. {"days": 5, "replacements": 3, "limit_try": 15000})
  - DefaultCurrencyCode (CHAR(3), nullable — FK → currencies)
  - IsActive (BOOL)
  - DisplayOrder (SMALLINT)
  - audit alanları
  - Unique index: (CompanyId, Code) WHERE DeletedAt IS NULL
  - Index: (ProductCategoryId, IsActive)

CustomerProduct : TenantEntity (bağ tablosu + meta)
  - Id (SERIAL)
  - CompanyId (FK → companies)
  - CustomerId (FK → customers)
  - ProductId (FK → products)
  - CommissionRate (DECIMAL(6,3), nullable) — müşteri×ürün özelinde %
  - UnitPriceTry (DECIMAL(18,2), nullable) — standart birim fiyat (varsa)
  - StartDate (DATE, nullable — kontrat başlangıcı)
  - EndDate (DATE, nullable — kontrat bitişi)
  - IsActive (BOOL)
  - Notes (TEXT, nullable)
  - audit alanları
  - Unique index: (CompanyId, CustomerId, ProductId, StartDate)
    WHERE DeletedAt IS NULL  — aynı müşteri×ürün aynı dönemde iki kez
    aktifleşemez ama tarih aralığıyla yenileme tutulabilir.
  - Index: (CustomerId, IsActive), (ProductId, IsActive)
```

#### 2.2 BudgetEntry Genişletme

`BudgetEntry` tablosu + `ActualEntry` tablosu iki kritik değişim:
- **`ProductId` FK alanı eklenir** (önce `nullable` başlar — geriye uyum için; migration sonrası yeni girişler zorunlu, eski satırlar null kalır)
- **Unique constraint değişir:**
  ```
  Önce:  UNIQUE (version_id, customer_id, month, entry_type)
  Sonra: UNIQUE (version_id, customer_id, product_id, month, entry_type)
  ```
  `product_id IS NULL` satırları için ayrı partial unique (`WHERE product_id IS NULL`) korunur ki geçiş döneminde çakışma olmasın.
- **Business rule (Application katmanı):** Müşteri×ay×EntryType için toplamda ya **bir NULL product_id satır** olabilir (toplu giriş) ya da **N adet ProductId dolu satır** (ürün kırılımı) — ikisi aynı anda değil. Validator'da kontrol edilir. Uzun vadede NULL product_id tamamen deprecate edilir.

#### 2.3 Varsayılan Seed (Muhasebe Onayı Sonrası)

Muhasebe ile doğrulanacak başlangıç katalog taslağı — kod sadece örnek, final seed karar sonrası:

```
ProductCategory seed:
  YOL_YARDIM         "Yol Yardım"
  IKAME_ARAC         "İkame Araç"
  EKSPER_HIZMETI     "Eksper Hizmeti"
  KONUT_ASISTANS     "Konut Asistans"
  SAGLIK_ASISTANS    "Sağlık Asistans"
  MINI_ONARIM        "Mini Onarım"
  WARRANTY           "Warranty & Garanti Sonrası"
  SGK_TESVIK         "SGK Teşvik Gelirleri"

Product seed örnek (her kategori için 2-4 ürün):
  YOL_YARDIM × "LifeStyle Koruma"
  YOL_YARDIM × "Standart Paket"
  YOL_YARDIM × "Premium Paket"
  IKAME_ARAC × "3x2 gün"
  IKAME_ARAC × "5x3 gün"
  IKAME_ARAC × "7x5 gün"
  ...
```

#### 2.4 API Contract'ları (yeni)

```
GET    /api/product-categories                → list
POST   /api/product-categories                → create
PUT    /api/product-categories/{id}           → update
DELETE /api/product-categories/{id}           → soft delete

GET    /api/products?categoryId=&active=      → list
GET    /api/products/{id}                     → detail
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}

GET    /api/customers/{id}/products           → müşterinin aktif ürünleri
POST   /api/customers/{id}/products           → ürün bağla (CustomerProduct)
PUT    /api/customers/{id}/products/{cpId}    → komisyon/tarih güncelle
DELETE /api/customers/{id}/products/{cpId}    → pasifleştir
```

BudgetEntry endpoint'leri `ProductId` kabul etmeye genişletilir (optional body alanı olarak başlar).

#### 2.5 Frontend Değişiklikleri

- **Yeni sayfa:** `ProductsPage.tsx` — sol ağaç: ürün kategorileri, sağ panel: seçili kategorinin ürünleri (CRUD). `Sidebar.tsx` Yönetim grubuna "Ürün Yönetimi" nav item (`/products`).
- **Müşteri-Ürün bağlama:** `CustomersPage.tsx` "Müşteri × Ürün Matrisi" sekmesi gerçek API'ye bağlanır. Müşteri detayında ek sekme: aktif ürünler listesi + komisyon/tarih inline edit.
- **BudgetEntryPage:** mock `CUSTOMER_PRODUCTS` dizisi kaldırılır. Firm seçilince `GET /customers/{id}/products` çağrısı; o müşterinin aktif ürünleri satır olarak render edilir. Her hücre (ürün × ay) `BudgetEntry { ProductId }` satırına mapped edilir.

### 3. Reddedilen Alternatifler

**A) Ürünleri `ExpenseCategory` gibi tek düz tabloda tut, `ProductCategoryId` kendine self-FK:**
Bağ tablosu (`CustomerProduct`) yerine `BudgetEntry`'ye doğrudan `ProductId` ekle; müşteri-ürün ilişkisi implicit (hangi müşteriye hangi ürün girildi ise o bağ var). **Reddedildi** çünkü kontrat metadata'sı (komisyon, başlangıç/bitiş tarihi) sağ bacağı gerektiriyor; ayrıca müşteri sayfasında "hangi ürünler aktif" query'si explicit bağ olmadan yapılamaz.

**B) `Product` yerine `ExpenseCategory` genişlet:**
Schema'nın domain bucket'larıyla karışır, ADR-0012 çelişkisi büyür. Gider tarafı (ExpenseCategory) ve satış tarafı (Product) farklı kavramlar — ayrı kalmalı.

**C) `CoverageTerms` için normalize tablo (`ProductAttribute` vs.):**
Teminat parametreleri ürün başına 2-6 alan olabilir, çoğu sayı. EAV anti-pattern riski yerine **JSONB** tercih edildi — PostgreSQL 16'da indekslenebilir, validator Application katmanında.

**D) `BudgetEntry.ProductId` zorunlu (NOT NULL) olarak başlat:**
Mevcut veri seti (var olan bütçe girişleri) product_id'siz → migration anında tüm satırlar kırılır. **Reddedildi**: nullable başlat + yeni girişler için uygulama katmanında zorunluluk + sonraki ADR ile NOT NULL'a geçiş.

### 4. Sonuçlar

**Pozitif:**
- Gerçek FinOps Tur iş modeli: komisyon, teminat, ürün bazlı marj analizi
- Dashboard/Forecast/Variance ürün kırılımıyla zengin raporlama (Loss Ratio ürün bazında, en kârlı ürün, vs.)
- `CustomerProduct` kontrat tarihi + komisyon tarihsel izlenir → audit dostu
- Mevcut mock UI (`CUSTOMER_PRODUCTS`, `MATRIX_ROWS`) gerçek API ile değiştirilebilir

**Negatif:**
- 3 yeni tablo + 1 genişletme = **1 migration** (~300 satır DDL)
- Backend: 3 entity + 3 configuration + 3 service + 3 controller + DTO'lar + validator'lar
- Frontend: yeni sayfa (`ProductsPage`) + 2 sayfa güncelleme (`CustomersPage`, `BudgetEntryPage`)
- `BudgetEntry` unique constraint değişimi — golden scenario fixture yeniden yazılır
- Seed verisi muhasebe ekibiyle beraber hazırlanmalı (kategori + ürün listesi + komisyon varsayılanları)

**Risk:**
- Nullable `ProductId` geçiş döneminde data hygiene bozulabilir — migration script'i mevcut BudgetEntry satırlarını "eski kayıt" flag'iyle işaretlemeli. Raporlama tarafında da "ProductId = NULL" toplamlarının ayrı görünmesi gerekir.

### 5. Tahmini İş Dağılımı (Sprint Planlaması İçin)

| Katman | İş | Tahmini |
|---|---|---|
| Backend domain | 3 entity + 3 EF config + migration + seed | ~1-1.5 gün |
| Backend servis + API | 3 controller + DTO + validator + service | ~1.5-2 gün |
| Unit test | Entity invariant + validator + service happy/sad path | ~1 gün |
| Integration test | Testcontainers + RLS + unique constraint ispat | ~1 gün |
| Frontend yeni sayfa | `ProductsPage` CRUD + Sidebar nav | ~1 gün |
| Frontend entegrasyon | `CustomersPage` matrix gerçek API, `BudgetEntryPage` ürün fetch | ~1.5 gün |
| Seed verisi | Muhasebe ile kategori + ürün listesi doğrulama | ~0.5 gün (paralel) |
| Regression + golden fixture | Excel baseline ürün kırılımıyla yeniden hesap | ~1 gün |

**Toplam:** ~8-9 iş günü (1.5-2 sprint tek geliştirici, yarıya iner paralel çalışma).

### 6. Eylem Maddeleri (Karar Öncesi)

- [ ] Muhasebe + operasyon ekibinden ürün kategori listesi onayı (§2.3 taslağı ile)
- [ ] Her kategori için başlangıç ürün katalogu (teminat parametreleriyle birlikte)
- [ ] `CustomerProduct.CommissionRate` kaynakları — mevcut sözleşmelerden migrate edilebilir mi? Excel import akışı?
- [ ] `BudgetEntry.ProductId` nullable → NOT NULL geçiş zamanlaması (sonraki ADR: veri temizliği sonrası)
- [ ] Bu ADR kabul edildiğinde: implementation ADR-0013A (migration + entity + API) + ADR-0013B (frontend UI + entegrasyon) olarak iki alt-ADR'a bölünebilir

---

## ADR-0014 — Kontrat Kodu (Akıllı Kod) Domain'i: Contract Entity + 14 Segment

**Tarih:** 2026-04-18
**Statü:** Kabul edildi — implementasyon başlatıldı
**Karar Sahibi:** Timur Turan

### 1. Bağlam

Tur Assist Group, sözleşmeleri **14 segmentli "akıllı kod"** ile tanımlıyor (örn. `TA1SGK0B000101010000013652CC1-V1`). Kod, operasyon ve muhasebenin tek ortak dili: hangi şirket, iş kolu, satış tipi, ürün tipi, araç tipi, müşteri, sözleşme şekli, ürün ID, ödeme şekli, ayarlama klozu, clean-cut/run-off, hizmet alanı ve versiyon tek stringte taşınıyor.

Mevcut domain'de (ADR-0013 sonrası) kontrat karşılığı `CustomerProduct` (müşteri × ürün bağ tablosu) + `BudgetEntry.ProductId`. Ancak:
- 14 segmentin hiçbiri domain'de modellenmemiş (grep: `Kontrat`/`ContractCode` sıfır eşleşme)
- Operatör Excel formatında sözleşme takibi yapamıyor
- Raporlama "hangi iş kolunda/araç tipinde ne kadar bütçe?" sorusuna cevap veremiyor
- Versiyonlama kuralları (limit değişti → V++, prim değişti → aynı kod, kapsam değişti → yeni kod) domain'de yok

### 2. Karar — Önerilen Domain Modeli

#### 2.1 `CustomerProduct` → `Contract` rename + extend

`CustomerProduct` zaten kontrat satırının kendisi (`CustomerId + ProductId + StartDate + EndDate + UnitPriceTry`). Paralel `Contract` entity duplication doğurur. **Karar:** rename + 10 metadata kolonu + `Version` + stored `ContractCode` kolonu.

**Alan ekleri (tümü NOT NULL, default değerleri migration backfill'de):**

| Alan | Tip | Kaynak segment | Default (mevcut satırlar için) |
|---|---|---|---|
| `BusinessLine` | `smallint` enum | #2 iş kolu | `0` (DIGER) |
| `SalesType` | `varchar(2)` enum | #3 satış tipi | müşterinin `Segment.Code`'undan map |
| `ProductType` | `varchar(2)` enum | #4 ürün tipi | `D0` (DIGER) |
| `VehicleType` | `varchar(3)` enum | #5 araç tipi | `000` (boş) |
| `ContractForm` | `smallint` enum | #7 sözleşme şekli | `2` (Hizmet bazlı) |
| `ContractType` | `smallint` enum | #8 sözleşme tipi | `1` (Poliçe başı) |
| `PaymentFrequency` | `varchar(4)` enum | #10 ödeme şekli | `P00` (peşin) |
| `AdjustmentClause` | `smallint` enum | #11 ayarlama | `2` (klozsuz) |
| `ContractKind` | `varchar(2)` enum | #12 tür | `CC` (Clean Cut) |
| `ServiceArea` | `smallint` enum | #13 hizmet alanı | `1` (yurt içi) |
| `Version` | `smallint` | #14 versiyon | `1` |
| `ContractCode` | `varchar(40)` stored | full string | migration sonrası `Regenerate()` |

**Unique index:** `(company_id, contract_code) WHERE deleted_at IS NULL` — aynı kod iki kez aktif olamaz.

#### 2.2 `ProductType` ve `VehicleType` konumu

Q: Bu iki segment `Product` katalog satırında mı, `Contract` sözleşme satırında mı?

**Karar: Contract kolonları.** Gerekçe: Spec'teki Örnek 1 ve Örnek 3 aynı müşterideki (Mapfre `01`) aynı ProductType'ta (`K0`) ama farklı Product ID'lerde (`0000001` vs `0000023`) kontratlar. Yani aynı katalog ürünü farklı sigorta türü / araç kapsamı altında satılabiliyor — `ProductType` ve `VehicleType` **satış anı özellikleri**, katalog özellikleri değil.

`Product` entity'si sade kalır: `Code + Name + ProductCategoryId + CoverageTermsJson`.

#### 2.3 Versiyonlama kuralları — operator-driven

Operatör UI'dan revizyon başlatırken `ContractChangeType` seçer:

| ContractChangeType | Domain davranışı | Kontrat kodu sonucu |
|---|---|---|
| `LimitChange` | Yeni satır: Version++ | aynı kod, `-V(n+1)` |
| `PriceChange` | Mevcut satır: UnitPriceTry update, versiyon atlatma | aynı kod |
| `LimitAndPrice` | Yeni satır: Version++ | aynı kod, `-V(n+1)` |
| `CoverageChange` | Yeni Product (yeni 7-digit ID), yeni Contract | **tamamen yeni kod** |
| `VehicleChange` | İkame araç üretim böl → Version++ | aynı kod, `-V(n+1)` |
| `PeriodRenewal` | Dönem yenileme → Version++ | aynı kod, `-V(n+1)` |

Spec'teki "T2R5 (2 Teklif 5 Revize)" koda yansımaz — UI'da revizyon sayacı gösterilir, domain'de bir sütun (`RevisionCount`).

#### 2.4 Müşteri 2-haneli ID

Yeni kolon: `Customer.ShortId SMALLINT` (0-99 arası). Company başına sequential, unique index `(company_id, short_id)`.

**Kapasite uyarısı:** Prod'da ~98 müşteri var. Sınıra yakın. 99'a yaklaşınca 3-hane migration gerekecek (`-S3-SozlesmeKodu-3-Hane-Genisletme` ADR'si açılacak).

Reserved: `00` = sistem müşterileri (SGK-TESVIK vb.), `01-99` = gerçek müşteriler.

#### 2.5 Ürün 7-haneli ID

`Product.Id SERIAL int` zaten var. Kod render'ında `.ToString("D7")` ile zero-pad. Şema değişikliği yok.

#### 2.6 `BudgetEntry` kontrat bağı

`BudgetEntry.ProductId` (nullable) yanına `ContractId` (nullable) FK eklenir. Geçiş döneminde ikisi paralel:
- Yeni satırlar: `ContractId` zorunlu (application validator).
- Eski satırlar: `ProductId` kalır, `ContractId = NULL`.

Sonraki ADR'de (ADR-0015, veri temizliği sonrası) `ProductId` drop + `ContractId` NOT NULL.

#### 2.7 ContractCode üretim/parse

- Üretim: `Core/Services/ContractCodeBuilder` — entity field'larından 14 segmenti birleştirir.
- Parse: `Core/Services/ContractCodeParser` — string'i segmentlere ayırır (T365 ↔ 365 çift kabul — spec örneklerinde tutarsız).
- Stored kolon: Contract create/update sırasında domain service `Regenerate()` çağırır. Read-only hesaplama değil — indekslenebilsin diye gerçek kolon.
- Payment frequency render: `T365` → `"365"` (spec örnek 1 ve 3 ile uyumlu, T'siz 3 hane); diğerleri (T01, T02, T03, T12) prefix korur; `P00` olduğu gibi.

### 3. Reddedilen Alternatifler

**A) Contract entity yeni tablo olsun, CustomerProduct korunsun:**
Lifecycle duplication — StartDate/EndDate/UnitPrice hangisinde? Dağıtık state. Reddedildi.

**B) ContractCode computed column (PostgreSQL generated):**
Enum → string map'i C# tarafında; DB'de aynı mantığı SQL fonksiyonu ile tekrar yazmak drift riski. Stored kolon + application-side regenerate tercih edildi.

**C) Versiyonlama otomatik diff (CoverageTermsJson karşılaştır):**
"Limit" ile "kapsam" ayrımı JSON'dan programatik çıkmaz (hangi key limit? hangisi scope?). Operator-driven seçim daha deterministik, audit için de açık.

**D) ProductType/VehicleType Product katalog kolonları:**
Spec örnekleri farklı ProductType'ta aynı Product ID kullanımına izin verir görünmüyor ama aynı müşterinin aynı ProductType ile farklı Product ID'li kontratları var — yani ProductType Product'a bağlı değil, Contract'a bağlı. Reddedildi.

### 4. Sonuçlar

**Pozitif:**
- Operasyon ve muhasebe tek dil (14 segment kod)
- Raporlama: iş kolu, araç tipi, satış kanalı kırılımıyla zengin
- Versiyonlama domain-layer'da enforced
- Excel export: kontrat kodu kolonu bire bir

**Negatif:**
- 1 büyük migration (rename + 10 kolon + ShortId + BudgetEntry.ContractId)
- 11 enum + 1 value object + 2 service + revizyon service
- Frontend: yeni ContractsPage + BudgetEntryPage/CustomersPage güncellemesi
- Mevcut unit testler (CustomerProductTests) Contract adıyla güncellenmeli

**Risk:**
- 2-haneli ShortId sınırı: 99 müşteriye dayanınca ADR-0015 (3 haneye geçiş) şart
- Parse esnekliği (T365 ↔ 365) gelecekte kafa karıştırabilir — builder default'u örnek-uyumlu ("365") sabitlendi
- Versiyonlama kararı operatör elinde → yanlış seçim yanlış kod üretir; UI'da her ChangeType'ın domain sonucu gösterilecek

### 5. Açık Doğrulama (Muhasebe)

- [ ] Her enum için Tur Assist'in resmi kodları (SG/OM/DK/OF/MD satış tipi; K0/T0/G0/W0/B0/F0/İ0/K1/FK/K2/İ1/Y0/D0 ürün tipi) doğru mu?
- [ ] `Segment.Code` ↔ `SalesType` map'i (mevcut SIGORTA→SG, OTOMOTIV→OM, FILO→OF, ALTERNATIF→DK, SGK_TESVIK→MD) doğru mu?
- [ ] İş kolu 7 "Seyahat" enum'da var ama şu an kullanımı olmayabilir — seed'e gerek var mı?
- [ ] Payment frequency `T365` render formatı (T'li mi, T'siz mi?) — şimdilik T'siz ("365")

### 6. Implementation Fazları

1. Core enums + ContractCode VO + Builder/Parser + unit tests
2. CustomerProduct → Contract rename + entity metadata
3. Customer.ShortId + migration + backfill
4. Versioning service + ContractChangeType + tests
5. Application + API layer
6. Frontend (ContractsPage + BudgetEntry/Customers güncellemeleri)
7. Integration tests

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
