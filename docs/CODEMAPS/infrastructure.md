# Codemap — `BudgetTracker.Infrastructure`

> Persistans, multi-tenancy enforcement ve external adapter implementasyonları. `Application` arayüzlerini somutlaştırır; `Core`'a doğrudan bağımlıdır.

**Son güncelleme:** 2026-04-15 (S2)

---

## Klasör yapısı

```
src/BudgetTracker.Infrastructure/
├── Common/
│   └── SystemClock.cs                                     # IClock impl
├── Persistence/
│   ├── ApplicationDbContext.cs                            # EF Core DbContext, IApplicationDbContext impl
│   ├── DesignTimeDbContextFactory.cs                      # `dotnet ef` CLI için
│   ├── TenantContext.cs                                   # AsyncLocal-based ITenantContext
│   ├── Configurations/
│   │   ├── AuditLogEntryConfiguration.cs
│   │   ├── BudgetVersionConfiguration.cs
│   │   ├── BudgetYearConfiguration.cs
│   │   ├── CompanyConfiguration.cs
│   │   ├── CurrencyConfiguration.cs
│   │   ├── EnumToStringConverter.cs                       # PascalCase ↔ SCREAMING_SNAKE_CASE
│   │   ├── ExpenseCategoryConfiguration.cs
│   │   ├── FxRateConfiguration.cs
│   │   └── SegmentConfiguration.cs
│   ├── Interceptors/
│   │   └── TenantConnectionInterceptor.cs                 # GUC her connection'a basar
│   └── Migrations/
│       ├── 20260415045722_InitialSchema.cs                # 8 tablo + RLS + audit partition + EXCLUDE + seed
│       └── ApplicationDbContextModelSnapshot.cs
└── DependencyInjection.cs                                 # AddInfrastructure ext method
```

---

## Önemli tipler

### `ApplicationDbContext` (`Persistence/ApplicationDbContext.cs`)

EF Core 10 DbContext, `IApplicationDbContext` arayüzünü uygular. `IModelCacheKeyFactory` kullanmadığımız için tek model cache instance'ı; tenant filter `OnModelCreating` zamanında bound olur, runtime tenant değişimi `TenantContext` üzerinden yönetilir.

- `SaveChangesAsync` → `override`, üst sınıfa delegasyon (S2 sonunda audit interceptor henüz takılmadı)
- 8 `DbSet<T>` exposure
- Snake_case naming convention `UseSnakeCaseNamingConvention()` ile `OnConfiguring`'de değil, `AddInfrastructure` DI extension'da uygulanır

### `TenantContext` (`Persistence/TenantContext.cs`)

`AsyncLocal<TenantState>` üzerinde tenant scope yönetir. Production kullanım:

```csharp
using (tenantContext.BeginScope(currentUser.CompanyId))
{
    // Bu scope içinde tüm DB sorguları company_id filter alır
    var versions = await dbContext.BudgetVersions.ToListAsync();
}
```

`BeginBypassScope()` arka plan job'ları için cross-tenant erişim açar (RLS açısından default-deny — GUC `''` olur, satır gelmez; superuser context'i ayrı).

### `TenantConnectionInterceptor` (`Persistence/Interceptors/TenantConnectionInterceptor.cs`)

`DbConnectionInterceptor.ConnectionOpenedAsync` her opened connection için tetiklenir. Çağrı:

```sql
SELECT set_config('app.current_company_id', @cid, false)
```

`is_local=false` çünkü EF connection pool'u transaction sınırlarını aşar; aksi halde GUC bir sonraki kullanıcıya sızabilirdi. Bypass scope'ta GUC empty string'e reset edilir → RLS default-deny.

### `EnumToStringConverter` (`Persistence/Configurations/EnumToStringConverter.cs`)

Güncel akışta `BudgetVersionStatus` değerleri `Draft`, `PendingFinance`, `PendingCfo`, `Active`, `Rejected`, `Archived` olarak saklanır. Tarihsel migration'lar eski `DEPT_APPROVED` / `FINANCE_APPROVED` gibi değerleri yeni enum değerlerine mapler. Generic converter, enum string karşılıklarını tek doğru kaynakta hizalar.

### `Migration: 20260415045722_InitialSchema`

Day-1 multi-tenant şemasının tamamı:

1. **Extensions:** `pgcrypto`, `btree_gist`
2. **Role:** `budget_app` (`NOSUPERUSER NOBYPASSRLS LOGIN`)
3. **Tables (EF generated):** 8 entity için `CreateTable` çağrıları
4. **CHECK constraints:** enum string kolonları için (defense-in-depth)
5. **EXCLUDE constraint:** `budget_versions` üzerinde `(company_id, budget_year_id)` aktif tekilliği
6. **Audit partitioning:** EF-generated `audit_logs` drop edilir, `PARTITION BY RANGE (created_at)` ile yeniden yaratılır + 2 başlangıç partition + 2 index
7. **RLS:** 4 tenant tablosunda `ENABLE + FORCE` + `tenant_isolation` policy (`NULLIF(...,'')::INT`)
8. **GRANTs:** `budget_app` rolüne DML grants, `audit_logs` üzerinde sadece INSERT/SELECT
9. **Seed:** 3 currency, 1 company (TAG), 5 segment, 9 expense category

> **NOT (production deploy):** Migration `budget_app` rolünü sabit dev şifresiyle yaratır. Production deploy script'i ortam değişkeninden okuyup `ALTER ROLE budget_app PASSWORD '...'` çalıştırmalı.

---

## Bağımlılık akışı

```
Api ──┐
      ├──► Application (interfaces)
      │        ▲
      │        │
      └──► Infrastructure ──► Core (entities)
```

- `Infrastructure` projesi **Application'a** depend eder (`IApplicationDbContext` arayüzünü implement etmek için)
- **Core'a** depend eder (entity tipleri için)
- `Api` → `Infrastructure` (DI composition)

---

## Test stratejisi

- **Unit testler** (`tests/BudgetTracker.UnitTests`) — Persistans katmanını test etmez; yalnızca `Core` domain logic
- **Integration testler** (`tests/BudgetTracker.IntegrationTests`) — Testcontainers ile gerçek Postgres 16; iki connection string:
  - **Superuser** (`postgres` user) → arrange/seed, RLS bypass
  - **`budget_app`** → act, RLS gerçekten enforce
- `PostgresContainerFixture` `ICollectionFixture` ile tüm test sınıfları arasında paylaşılır; her test öncesi Respawn ile data reset

---

## Bilinen tuzaklar (S2 sırasında doğrulanmış)

1. **`current_setting('...', true)::INT` patlaması** — GUC unset olduğunda `''` döner, doğrudan `::INT` cast 22P02 fırlatır. Çözüm: `NULLIF(...,'')::INT`. Postgres planner AND clauselarını yeniden sıralayabildiği için `<> ''` guard yetmez.

2. **EF connection pool + GUC sızıntısı** — `set_config(..., false)` (is_local=false) kullanılır; aksi halde transaction sonunda GUC reset olmaz ve pool'dan dönen connection bir sonraki request'e yanlış tenant ile döner.

3. **Superuser RLS bypass** — `postgres` user RLS'i tamamen bypass eder. Test fixture'da gerçek RLS coverage istiyorsak `budget_app` (NOBYPASSRLS) ile bağlanmak zorundayız.

4. **`FORCE ROW LEVEL SECURITY`** — `ENABLE` tek başına yetmiyor; table owner (`budgettracker` user) yine bypass eder. `FORCE` hem owner hem app rolü için politikayı uygular.

5. **`FluentAssertions 8.x` lisansı** — Xceed BUSL'a geçti. 6.12.2 son MIT sürüm — `Directory.Packages.props`'ta pinli.

---

## Sonraki S3 etkileri

S3'te (Identity + OpenIddict) bu katman üzerinde:
- `IdentityDbContext`'i `ApplicationDbContext` ile tek migration assembly altında tutmak için ayrı `OpenIddictMigration` lazım
- `ICurrentUser` implementasyonu ASP.NET Identity claim'lerinden CompanyId çıkaracak
- `TenantContext.BeginScope` middleware tarafından her authenticated request'in başında çağrılacak
