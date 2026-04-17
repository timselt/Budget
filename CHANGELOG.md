# Changelog

Bu dosya, BudgetTracker projesindeki tüm dikkate değer değişiklikleri kayıt altına alır. Format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ilkelerine, sürüm numaralama [Semantic Versioning](https://semver.org/) prensibine göredir.

## [Unreleased]

### FAZ 4 Part 2a — OIDC §2.2 Revize + /forbidden Route + ADR-0011 Proposed (2026-04-17)

F4 Part 2 scope'u (MVP sayfa wiring + AG-Grid entegrasyonu + Playwright E2E + SameSite probe) tek oturumda sığmadığı için kullanıcı direktifiyle **SPLIT**'e gidildi. Part 2a bu PR'da; Part 2b (AG-Grid), Part 2c (Playwright harness + SameSite E2E — 7a/7b), Part 2d (AG-Grid paste E2E + F4 kapanış) ayrı branch + PR'larda devam eder.

#### Eklendi

- **`shared/ui/ForbiddenPage.tsx`** (ADR-0009 §2.2) — 403 landing sayfası. Lucide `ShieldAlert` ikon + i18next `errors.forbidden` + dashboard'a geri link. `App.tsx`'e `/forbidden` rotası eklendi (AuthGuard dışında — session temizlendiğinde re-auth loop oluşturmasın).
- **`lib/api.ts` 403 redirect** — axios response interceptor 403 yanıtlarında `/forbidden`'a yönlendirir (loop-safe guard ile). 401 refresh flow değişmedi.
- **`App.tsx` i18next bootstrap import** — `./shared/i18n` side-effect import app entry'sinde; i18next `.isInitialized` guard'ı sayesinde HMR/test double-init güvenli.

#### Değişti

- **ADR-0009 §2.2 revize** (Önerildi'den revize edildi) — F4 Part 2 keşfi: mevcut SPA OpenIddict **password grant** kullanıyor, PKCE değil. Password grant iç araç kullanım senaryosunda kabul edilebilir; PKCE migration F4 bütçesini şişirirdi. §2.2 "Password grant korundu; PKCE migration F8+'a ertelendi" olarak güncellendi. Reddedilen alternatifler tablosuna `1A /connect/authorize + PKCE (F4 Part 2 önerisi)` satırı eklendi.

#### Yeni ADR

- **ADR-0011 "Önerildi"** — OIDC Password Grant → Authorization Code + PKCE Migration (Aday). F8+ güvenlik hardening fazının konusu. Üç tehdit kayıt altına alındı (password exposure, localStorage token XSS, RFC 8252 non-compliance); migration maliyeti ve koşullu bağımlılıklar belgeli.

#### Test Kapsamı

| Katman | F4 Part 1 sonu | F4 Part 2a sonu | Delta |
|---|---|---|---|
| Backend unit | 144 | 144 | 0 |
| Backend integration | 34 | 34 | 0 |
| Client Vitest | 43 | 43 | 0 |
| **Toplam** | 221 | **221** | **0** |

Yeni test yok — değişiklikler redirect side-effect + yeni static component + ADR revizyonu; unit test kapsamında değil. `pnpm build` bundle 112 KB gzip (<300 KB limit).

---

### FAZ 4 Part 1 — Frontend Foundation + ADR-0008 §2.4 Finalize (2026-04-17)

ADR-0009 (Önerildi — F4 Part 2 kapanışında "Kabul edildi"ye geçer) kapsamında foundation iş paketi teslim edildi. Branch: `feat/f4-frontend-baseline`. MVP sayfa wiring + AG-Grid entegrasyonu + Cookie SameSite Playwright probe bilerek Part 2'ye bırakıldı; iki ince ayarın somut kanıtı ve §2.4 muhasebe finalize'ı main'e zamanında akıtılsın diye Part 1 ayrı PR olarak gönderildi.

#### Eklendi (client)

- **`parseTrNumber`** (ADR-0009 §2.5 / ince ayar #2) — TR-locale decimal parser. `"1.234,56"` → `1234.56` (bankacılık doğruluğu), en-US `"1,234.56"` reddedilir (`null`), `parseFloat("1.234")` = `1.234` regression guard. 25 Vitest assertion (`client/src/shared/lib/parseTrNumber.test.ts`).

- **`parseClipboardGrid` + `useClipboardRange`** (ADR-0009 §2.4 / ince ayar #1) — Excel tab+newline clipboard payload parser. Non-contiguous seçim (boş satır ayrıcı) contiguous block olarak yapıştırılır + toast: `"Non-contiguous aralık contiguous olarak yapıştırıldı."`. AG-Grid Community + custom hook yaklaşımı; Enterprise lisansı gereksiz. 12 Vitest assertion, ADR-0009 §2.4'teki 10 senaryonun tümü kapsandı.

- **i18n seed** (ADR-0009 §2.3) — `tr.json` (primary) + `en.json` (mirror) + `i18next` bootstrap (TR default, fallback TR). Key-count parity Vitest test — drift build'i fail eder. Muhasebe onayı sonrası `ExcelExportService` bu seed'e bağlanmıyor; gelecek EN locale talepleri için altyapı olarak korundu.

- **Vitest + jsdom altyapısı** — `pnpm test`, `pnpm test:watch`; `@testing-library/react` + `jest-dom` matcher'ları; `jsdom` ortamı. `0 → 39` client Vitest testi yeşil.

- **Paket pinleri** — `ag-grid-community`/`ag-grid-react` 32.3.3, `react-hook-form` 7.54.2, `zod` 3.24.1, `date-fns` 4.1.0, `i18next` 24.2.1 + `react-i18next` 15.4.0, `lucide-react` 0.474.0, `vitest` 2.1.8, `jsdom` 25.0.1, `@testing-library/react` 16.1.0 + `jest-dom` 6.6.3.

#### Değişti

- **ADR-0008 §2.4 muhasebe onayı 2026-04-17'de alındı** — Türkçe sabit Excel başlıkları (`Müşteri`, `Segment`, `Ocak`…`Aralık`, `Toplam`) onaylandı. ADR "Fully Accepted"; ADR-0009 §2.7 deadline tracker (2026-04-20) beklenmeden kapandı. `ExcelExportService` kodunda değişiklik yok.
- **CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #5** ("Excel şablon başlık dili") aktif listeden çıkarıldı (5→4 madde), altta "Kapandı" bölümünde strike-through.

#### Ertelenen (F4 Part 2 — ayrı PR)

- **ADR-0009 §2.1** SPA feature-based klasör refactor
- **ADR-0009 §2.2** OIDC code + PKCE flow (/connect/authorize redirect)
- **ADR-0009 §2.4 uygulama** — AG-Grid entegrasyonu `BudgetEntryPage`'de `useClipboardRange` hook'unu bağlar
- **ADR-0009 §2.6** Cookie SameSite=Strict Playwright probe + `/hangfire` CSRF token fallback
- **ADR-0009 "Kabul edildi"** — Part 2 kapanışında tam statüye geçer

#### Test Kapsamı

| Katman | F3 sonu | F4 Part 1 sonu | Delta |
|---|---|---|---|
| Backend unit | 144 | 144 | 0 |
| Backend integration | 34 | 34 | 0 |
| **Client Vitest** | **0** | **39** | **+39** |
| **Toplam** | 178 | **217** | **+39** |

---

### FAZ 3 — Excel Import/Export + PDF + F2 Ertelenen (2026-04-17)

ADR-0008 kapsamı (Kabul edildi — §2.4 koşullu) + MIGRATION_PLAN.md §3 FAZ 3 teslim edildi. Branch: `feat/f3-excel-pdf`. İnce ayar #1 disiplini: ADR-0008 F3 başında "Önerildi" yazıldı (commit `badb6e5`), F3 sonunda "Kabul edildi"ye çevrildi (commit `438a43e`).

#### Eklendi

- **`IImportGuard` + `PgAdvisoryImportGuard`** (ADR-0008 §2.3) — `pg_try_advisory_xact_lock(hashtextextended('import:{companyId}:{resource}', 0))`, transaction scope'lu, auto-release. `ImportConcurrencyConflictException` → HTTP 409 (Türkçe mesaj). 6 integration test (solo/cross-tenant/cross-resource/auto-release/no-tx).

- **`ExcelImportService` preview/commit split + tenant limitleri** (ADR-0008 §2.1) — `ImportLimits.MaxBytes = 10 MB`, `MaxRows = 50 000`, `BudgetEntriesResource`. `PreviewAsync` validation-only (lock almaz, non-binding snapshot — explicit docstring). `CommitAsync` advisory lock + transactional insert + audit events (`IMPORT_PREVIEWED`, `IMPORT_COMMITTED`, `IMPORT_REJECTED_LIMIT`, `IMPORT_CONCURRENCY_CONFLICT`). `ImportFileTooLargeException` → HTTP 422. Kapalı dönem kilidi (`BudgetYear.IsLocked`) → HTTP 409. Audit en iyi çaba — DB hatası 422'yi 500'e çevirmez. Tenant filter defense-in-depth (`CompanyId` explicit). 6 integration test.

- **`PdfReportService` Lato TTF subset + KVKK footer** (ADR-0008 §2.2) — Lato-Regular + Lato-Bold TTF `EmbeddedResource` olarak Infrastructure assembly'sinde. `QuestPdfFontBootstrap` `Lazy<T>` ile thread-safe ve exception-propagating registration. `DefaultTextStyle.FontFamily("Lato")`; her sayfa footer'ında "KVKK Madde 11 uyarınca kişisel veri içerir — yetkisiz paylaşım yasaktır." notu. PDF <200 KB hedefi. 3 integration test (generate + Lato byte scan + source-level KVKK guard).

- **`ExceptionMessageSanitizer`** (ADR-0008 §2.5, F2 carry-over) — 4 GeneratedRegex mask: Npgsql connection fragments (`Host`, `Password`, `Username`, `User ID`, `Port`, `Database`), POSIX paths (`/etc` `/var` `/home` `/usr` `/opt` `/tmp` `/root` `/app` `/proc` `/mnt` `/srv` `/run`), Windows drive-letter paths, certificate extensions (`.pfx` `.key` `.p12` `.keystore`). `GlobalExceptionHandler.Detail` + log messages bu helper'dan geçer. 16 unit test.

- **`ReportsController`** — `POST /api/v1/reports/budget/import/preview` + `.../commit` (iki endpoint de Finance/Cfo policy + `[RequestSizeLimit(10 MB)]` + `[RequestFormLimits]`). Framework katmanında oversize reject. `GetUserId()` `int.TryParse` + `UnauthorizedAccessException` (→ 403) — magic-string `FormatException` (→ 500) bypass'ı kapatıldı.

- **`GlobalExceptionHandler`** — `ImportFileTooLargeException` → 422, `ImportConcurrencyConflictException` → 409. Log mesajlarına `Path` + `TraceIdentifier` + sanitizer uygulanmış `SafeMessage` — Seq tenant/tx korelasyonu.

#### Değişti

- Lato TTF fontları (`Lato-Regular.ttf`, `Lato-Bold.ttf`, `OFL.txt`) `src/BudgetTracker.Infrastructure/Resources/Fonts/` altında yeni dizin (OFL 1.1 lisansı repo'ya eklendi).
- `AuditActions`/`AuditEntityNames`: 4 yeni action sabiti + `BudgetVersion` entity name.
- `IExcelImportService` interface tamamen yeniden yazıldı (eski `ImportBudgetEntriesAsync` kaldırıldı, preview/commit ayrımına geçildi) — BREAKING ama sadece test + bu controller kullanıyordu.

#### Test Kapsamı

| Katman | F2 sonu | F3 sonu | Delta |
|---|---|---|---|
| Unit | 128 | **144** | +16 (sanitizer) |
| Integration | 19 | **34** | +15 (advisory lock 6, Excel import 6, PDF 3) |
| **Toplam** | 147 | **178** | **0 fail** |

#### Ertelenen (F4+)

- **§2.4 muhasebe teyidi** — Türkçe sabit başlıklar uygulanmış; muhasebe ekibi yazılı onay verdiğinde ADR "Kabul edildi" fully-unconditional'a geçer. Reddedilirse F4 SPA i18n framework ile TR/EN alias migrasyonu (≈0.5 gün).
- **SQL injection false positive** (csharp HIGH) — `PgAdvisoryImportGuard` EF `SqlQuery<bool>($"...")` parametrize ediyor; bulgu false positive olarak raporda belgelendi.

---

### FAZ 2 — Hangfire Dashboard + Seq Observability + F1 Ertelenen (2026-04-17)

MIGRATION_PLAN.md §3 FAZ 2 + ADR-0007 kapsamında gözlemlenebilirlik katmanı + F1 review'dan ertelenen iki HIGH kalemi teslim edildi. Tüm işler `feat/f2-hangfire-seq-observability` branch'inde; ADR-0007 ince ayar #1 gereği F2 başında "Önerildi" olarak açıldı (commit `78c5032`), F2 sonunda "Kabul edildi"ye çevrildi (commit `244419f`).

#### Eklendi

- **Hangfire Dashboard** — `/hangfire` endpoint, `HangfireDashboardAuthorizationFilter` ile Admin veya Cfo rolü zorunlu. Anonim `401`, authenticated wrong-role `403`, Admin/Cfo `200` (ADR-0007 §2.1). Default `LocalRequestsOnlyAuthorizationFilter` Railway'de anlamsız olduğu için kaldırıldı. 10 unit test (anon/Viewer/Finance/Admin/Cfo/multi-role + status code kanıtları).

- **Serilog + Seq sink** — `Program.cs` bootstrap logger + `Host.UseSerilog` (`ReadFrom.Configuration` + `ReadFrom.Services`). `appsettings.Development.json` Console + Seq sink (`http://localhost:5341`). **Production appsettings dosyası yok** — Railway env ile `Serilog__WriteTo__1__Args__serverUrl` inject edilir (ince ayar #3: F1 rotate-db-password ile aynı secret disiplini). `app.UseSerilogRequestLogging` her HTTP request için structured özet satırı. `Log.CloseAndFlush()` top-level finally ile garanti. `Serilog.Debugging.SelfLog.Enable(Console.Error)` enricher/sink hatalarını stderr'e yansıtır.

- **Structured enricher'lar** (ADR-0007 §2.3) — `BudgetTrackerLogEnricher`:
  - HTTP path → `tenant_id`, `user_id`, `request_id`
  - Background-job path (HttpContext null) → `job_context=hangfire` + ambient `tenant_id`
  - Null-safe: `IHttpContextAccessor`/`ITenantContext` yoksa exception yok
  - `user_id` claim '@' içeriyorsa `***` ile değiştirilir (custom OpenIddict mapping bypass koruması)
  - 5 unit test.

- **PII masking enricher** (ADR-0007 §2.4, **log-only**) — `PiiMaskingEnricher`:
  - `Email`/`email` → `u***@domain.tld`
  - `IpAddress`/`ip_address`/`ClientIp`/`client_ip` → IPv4 son oktet veya IPv6 son grup maskelenir
  - Tip-bypass koruması: property string değilse `***` sentinel
  - `try/catch` + `SelfLog` (enricher never throws)
  - **Kapsam:** sadece Seq'e giden log; `audit_logs` tablosu ham IP ile kalır (KVKK meşru menfaat — F6 `docs/kvkk-uyum.md`'de dokümante edilecek)
  - 17 unit test.

- **Health checks** — `/health/live` (process, değişmedi) + `/health/ready` (`DbContextCheck` + yeni `HangfireStorageHealthCheck`). Hangfire storage probe senkron `IMonitoringApi` çağrısını `Task.Run` ile thread pool'a offload eder (thread-pool açlığı koruması). Response body minimal (`"ok"` / `"unreachable"`); istatistikler sadece `ILogger`'a — anonim erişime stats sızdırılmaz.

#### Değişti (F1 ertelenen HIGH fix'ler)

- **`AuditLogger` → `IDbContextFactory<ApplicationDbContext>`** (ADR-0007 §2.6 / F1 csharp-reviewer HIGH) — `services.AddDbContextFactory<ApplicationDbContext>(..., Singleton)` eklendi; `AuditLogger` her `LogAsync`'te kısa-ömürlü context açar. Business `SaveChanges` rollback'i audit satırını etkileyemez. Factory context `UseOpenIddict()` çağırmaz (duplicate model registration riski giderildi). `CreateDbContextAsync` + `SaveChangesAsync` birlikte `try/catch` içinde (pool exhaustion logging). **1 yeni izolasyon integration testi** (business rollback → audit satırı yaşar).

- **`TenantConnectionInterceptor` async fix** (ADR-0007 §2.7 / F1 csharp-reviewer HIGH) — sync override artık `.GetAwaiter().GetResult()` kullanmıyor; sync ve async path kendi ADO.NET komutlarını çalıştırıyor. Exception durumunda connection kapatılıp rethrow — silent RLS bypass koruması (empty-string default-deny'a düşme engellendi). **4 yeni integration testi** (sync/async + tenant/bypass kombinasyonları).

#### Paketler

- `Serilog` 4.2.0, `Serilog.AspNetCore` 9.0.0, `Serilog.Sinks.Seq` 9.0.0, `Serilog.Sinks.Console` 6.0.0, `Serilog.Enrichers.Environment` 3.0.1, `Serilog.Enrichers.Thread` 4.0.0. `Hangfire.AspNetCore` Infrastructure csproj'una taşındı (dashboard filter için).

#### Test Kapsamı

- Unit: **96 → 128** (+32). Enricher/PII: 22, Dashboard filter: 10.
- Integration: **14 → 19** (+5). Interceptor sync/async: 4, AuditLogger izolasyon: 1.
- Toplam: **147 yeşil, 0 fail.**

#### Ertelenen (F3+)

- **CSRF / SameSite=Strict** (security-reviewer MEDIUM) — OpenIddict SSO redirect flow'u etkilenebilir; SPA tarafında doğrulama sonrası F3/F5.
- **Serilog sink index fragility** (security-reviewer LOW) — **ince ayar #3 direktifi gereği Railway env pattern'i korundu**; named-section'a geçiş F3+ opsiyonel hardening.
- **Exception message redaction** (security-reviewer LOW) — `Log.Fatal(ex, ...)` connection-string parçaları sızdırabilir; geniş stratejisi F3.
- **`appsettings.Development.json` dev password** (csharp-reviewer MEDIUM) — F6 UserSecrets geçişi.

---

### FAZ 1 — Operasyonel Kapanış (2026-04-17)

MIGRATION_PLAN.md §3 FAZ 1 kapsamında ADR-0002/0003/0006 açık aksiyonları kapatıldı. Tüm işler `feat/f1-operational-closure` branch'inde; F2'de Hangfire Dashboard + Seq entegrasyonu birleşik ADR-0007'de belgelenecek.

#### Eklendi

- **Audit yazıcı (`IAuditLogger`)** — `BudgetTracker.Application.Audit.IAuditLogger` + `AuditEvent` record + `AuditActions`/`AuditEntityNames` sabitleri; Infrastructure'da `AuditLogger` implementation'ı. Controller entegrasyonları: `AuthController` (`AUTH_SIGN_IN` + `AUTH_SIGN_IN_FAILED`), `AccountController.Register` (`AUTH_REGISTER`), yeni `POST /api/v1/account/logout` (`AUTH_SIGN_OUT`). Audit çağrıları best-effort sarmalandı; DB hatası HTTP 500 yerine sadece log'a yazılır. `unknown:{username}` key'i 128 karakterle kesilir.

- **Arkaplan görevleri (Hangfire 1.8.20 + Polly 8.5.2):**
  - `AuditPartitionMaintenanceJob` — Cron `0 2 1 * *` Europe/Istanbul. Mevcut ay + 3 ileri ay partition `CREATE TABLE ... PARTITION OF` (DO block, `pg_class`/`pg_namespace`'te public schema kontrollü). 84 ay+ eski partition'lar için `DETACH PARTITION` + `DROP TABLE IF EXISTS` (CLAUDE.md §Bilinen Tuzaklar #5 kurtarma penceresi). `GRANT INSERT, SELECT ... TO budget_app` her run'da re-apply (idempotent onarım). Per-partition try/catch — bir partition'da hata diğerlerini atlamaz.
  - `TcmbFxSyncJob` — Cron `45 15 * * 1-5` Europe/Istanbul. Polly v8 `ResiliencePipelineBuilder<int>` ile 3 retry exponential backoff (yalnız `HttpRequestException` handle); tüm retry'lar tükenirse önceki iş günü fallback (hafta sonu atlama). Pipeline options tuple'ına göre cache'lenir. `TcmbFxSyncOptions` config `Tcmb:Sync`.
  - `HangfireRecurringJobs.Register()` startup'ta 2 recurring job kaydeder; Testing env'de atlanır.
  - Hangfire storage + in-process server `Program.cs`'te; Dashboard UI **F2'ye ertelendi**.

- **TCMB servis davranış değişikliği (breaking):** `TcmbFxService.SyncRatesAsync` HTTP 4xx/5xx'de `HttpRequestException` fırlatır (eskiden `return 0`). `ParseTcmbXml` XML/decimal parse hatalarında `InvalidOperationException` fırlatır (eskiden silent swallow). Silent-failure yasağı (CLAUDE.md §Bilinen Tuzaklar #3). Job wrapper retry + fallback uyguluyor.

- **Production OIDC sertifika yüklemesi:** `OpenIddictCertificateOptions` (`OpenIddict:Certificates:{Encryption,Signing}:{Path,Password}`), `ProductionCertificateLoader.Load()` (`X509CertificateLoader.LoadPkcs12FromFile` + `EphemeralKeySet` — container'da filesystem yazma yok). `AuthenticationExtensions.AddBudgetTrackerAuthentication()` opsiyonel cert parametreleri alır; yoksa dev ephemeral. `disableTransportSecurity` default `false` (güvenli taraf). Hata mesajları iç path'i sızdırmaz.

- **Production OIDC SPA client seed:** `ProductionOidcClientSeeder` + `--seed-prod-oidc-client` CLI flag'i. `budget-tracker-spa` public client + PKCE zorunlu, absolute HTTPS redirect URI validasyonu. Mevcut client'ın redirect URI konfigürasyonla uyuşmuyorsa `LogWarning` (silent mismatch engellendi). Development env'de refüze edilir.

- **Release scriptleri ve runbook (`infra/release/`):** `rotate-db-password.sh` (`ALTER ROLE budget_app PASSWORD`, psql `-v` değişken binding — shell-level escape yok), `README.md` (password rotation, prod OIDC client seed, X509 cert üretimi/mount, release sıralaması).

- **Test kapsamı:**
  - Unit: **86 → 96** (+10). TcmbFxSyncJob retry/fallback/weekend-skip (7), TCMB XML silent-failure koruması (2), TcmbFxService HTTP non-success exception (1 güncellendi).
  - Integration: **6 → 14** (+8). AuditLogger round-trip + partition routing + nullable (3), AuditPartitionMaintenanceJob create/drop/retention/grant/index-inheritance (5). Gerçek Postgres 16 Testcontainers.
  - Toplam: **110 test yeşil, 0 fail.**

#### Değişti

- `DependencyInjection.AddInfrastructure()` imzası: opsiyonel `X509Certificate2?` cert parametreleri + `disableTransportSecurity` (Program.cs env-bazlı doldurur).
- `Program.cs`: Hangfire storage+server bootstrap, X509 cert koşullu yüklemesi, `--seed-prod-oidc-client` mode, recurring job register.
- Unit test `SyncRatesAsync_WhenHttpFails_ReturnsZero` → `SyncRatesAsync_WhenHttpReturnsNonSuccess_ThrowsHttpRequestException` (davranış değişikliğine uyumlu).

#### Takip Notları (F2+'ya taşındı)

- Hangfire Dashboard UI + OpenIddict-backed auth filter → **F2 / ADR-0007**.
- Seq sink + structured log enricher'lar (tenant_id, user_id, request_id) + PII masking → **F2**.
- Auth endpoint'leri için rate limit → **F5 veya F6** (genel policy).
- KVKK IP maskeleme — **F6 docs/kvkk-uyum.md** içinde policy kararı sonrası.
- `AuditLogger` için bağımsız `IDbContextFactory<ApplicationDbContext>` — scoped DbContext paylaşım riski (csharp-reviewer HIGH) → **F2/F3**.
- `TenantConnectionInterceptor` sync-over-async (pre-existing kod) → ayrı refactor kalemi.

### S18 — Code Splitting, Dashboard Entegrasyon, E2E Testler (2026-04-16)

#### Eklendi

- **Dashboard grafik entegrasyonu:**
  - DashboardPage'e 8 Recharts grafik + aylık özet tablo eklendi
  - Gelir-Hasar trend, Loss Ratio, EBITDA, Segment donut, Gider pie, Kümülatif alan, Combined Ratio, Top 10 müşteri

- **Code splitting (React.lazy):**
  - Tüm sayfalar lazy import ile ayrı chunk'lara bölündü
  - Ana bundle: 544kb → 61kb gzipped (ilk yükleme)
  - Sayfa bazlı chunk'lar ihtiyaç anında yüklenir
  - Suspense fallback: "Yükleniyor..." loader

- **E2E Testler (Playwright):**
  - playwright.config.ts — Chromium, screenshot on failure
  - auth.spec.ts — 5 test (login/logout/redirect)
  - navigation.spec.ts — 3 test (sidebar, page titles, history)
  - dashboard.spec.ts — 3 test (KPI cards, values, charts)
  - budget-entry.spec.ts — 3 test (grid, columns, tabs)
  - approvals.spec.ts — 3 test (versions, badges, queue)
  - Toplam: 17 E2E test senaryosu

---

### S8–S17 — Full Feature Implementation (2026-04-16)

#### S8 — AG-Grid Bütçe Giriş Sayfası
- AG-Grid Community ile spreadsheet UI (müşteri × 12 ay)
- Segment bazlı gruplama, inline editing, dirty cell vurgulama
- Gelir/Hasar sekmeleri, versiyon seçici, toplu kaydetme
- Türkçe sayı formatı (1.234.567)

#### S9 — Gider Giriş ve Özel Kalemler
- Hiyerarşik gider tablosu (GENERAL/TECHNICAL/EXTRAORDINARY sınıflandırma)
- Özel kalemler formu (Muallak, Demo Filo, Finansal Gelir/Gider, T.Katılım, Amortisman)
- Click-to-edit inline düzenleme, otomatik kaydetme

#### S10 — Dashboard Grafikleri (Recharts)
- 8 grafik: Gelir-Hasar trend, Loss Ratio, EBITDA bar, Segment donut, Gider pie, Kümülatif alan, Combined Ratio, Top 10 müşteri
- Aylık özet tablo (12 ay × 10 KPI)
- Dashboard filtreleri (yıl, versiyon, dönem, segment)
- ChartCard wrapper, chart-utils paylaşımlı yardımcılar

#### S11 — Onay Akışı UI
- Bütçe versiyon yönetimi sayfası (oluştur, sil, submit)
- Onay kuyruğu sayfası (bekleyen onaylar, onayla/reddet)
- StatusBadge (8 durum renk kodu), RejectModal (zorunlu gerekçe), ApprovalTimeline
- 12 API mutation hook'u (submit, approve/dept/finance/cfo, reject, activate, archive)

#### S12 — Variance Analysis (Backend + Frontend)
- **Backend:** VarianceService + VarianceController (summary, customers, heatmap)
- Alert eşikleri: gelir -%10 MEDIUM, hasar +%15 HIGH, LR>%80 HIGH, gider >%20 CRITICAL
- **Frontend:** Variance heatmap (yeşil→kırmızı), sapma tablosu, waterfall chart
- KPI özet kartları (gelir/hasar sapması, uyarı sayıları)

#### S13 — Müşteri ve Segment Analizi
- Müşteri kârlılık tablosu (sıralama, arama, segment filtre, sparkline)
- Müşteri detay sayfası (12 ay trend chart, KPI kartları)
- Segment radar chart (5 eksen karşılaştırma)
- Konsantrasyon analizi (Top 5/10/20 pay, HHI göstergesi)

#### S14 — Senaryo Motoru (Backend + Frontend)
- **Backend:** Scenario entity, ScenarioService, ScenariosController
- Parametre seti: gelir/hasar/gider % değişimi, versiyon başına max 5 senaryo
- **Frontend:** Senaryo form (slider + input), P&L karşılaştırma tablosu
- Tornado chart (hassasiyet analizi)

#### S15–S16 — Excel/PDF Export ve FX Sayfası
- **Excel:** ClosedXML ile bütçe export (Türkçe başlıklar, formatlanmış) + import (doğrulama)
- **PDF:** QuestPDF ile yönetim kurulu raporu (A4 landscape, KPI + müşteri tabloları)
- ReportsController (Excel download, PDF download, Excel upload)
- **FX sayfası:** Kur tablosu, manuel giriş formu, TCMB senkron butonu

#### S17 — Audit Log ve Admin
- **Backend:** AuditQueryService + AuditController + AdminController
- Audit log sayfası (filtrelenebilir tablo, tarih aralığı, pagination)
- Admin sayfası (kullanıcı yönetimi, şirket yönetimi, sekmeli UI)

#### Route & Navigation
- App.tsx: 12 route (tüm sayfalar AuthGuard korumalı)
- Sidebar: 10 nav item (Dashboard, Bütçe, Versiyonlar, Müşteriler, Giderler, BvA, Senaryolar, Döviz, Onaylar, Ayarlar)

---

### S7 — Frontend İskeleti: React + Vite + Tailwind (2026-04-16)

#### Eklendi

- **Vite + React 19 + TypeScript scaffold:**
  - `vite.config.ts` — Tailwind CSS 4 plugin, API proxy (3000→5000)
  - `tsconfig.json` strict mode

- **Tailwind CSS 4 tema sistemi (`index.css`):**
  - oklch renk paleti: primary (indigo), surface, border, text, success/warning/danger
  - CSS custom properties ile tutarlı tasarım token'ları

- **Routing + Layout:**
  - `App.tsx` — React Router v7 route tanımları
  - `AppLayout.tsx` — Sidebar + Outlet layout wrapper
  - `AuthGuard.tsx` — isAuthenticated kontrolü, login redirect
  - `Sidebar.tsx` — NavLink tabanlı navigasyon (Dashboard, Bütçe, Müşteriler, Giderler, Döviz Kurları)

- **Auth entegrasyonu:**
  - `stores/auth.ts` — Zustand store: login (OpenIddict password grant), logout, fetchUser (userinfo)
  - `lib/api.ts` — Axios instance: bearer token interceptor, 401 refresh token akışı

- **TanStack Query setup:**
  - `lib/query.ts` — QueryClient (staleTime 30s, retry 1)
  - `main.tsx` — QueryClientProvider + BrowserRouter provider zinciri

- **Login sayfası (`LoginPage.tsx`):**
  - E-posta/şifre formu, hata mesajı, yükleniyor state

- **Dashboard sayfası (`DashboardPage.tsx`):**
  - KPI kartları: 3 bölüm (Gelir & Hasar, Kârlılık, Oranlar), 12 KPI
  - `KpiCard.tsx` — Trend göstergeli yeniden kullanılabilir kart
  - `useDashboardKpis.ts` — TanStack Query hook

- **Placeholder sayfaları:** Bütçe, Müşteriler, Giderler, Döviz Kurları

#### Build
- JS: 100.75kb gzipped (budget: <300kb) ✓
- CSS: 3.69kb gzipped (budget: <50kb) ✓

---

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
