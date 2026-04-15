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

## ADR Şablonu

Yeni ADR eklerken aşağıdaki şablonu kullan:

```markdown
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
