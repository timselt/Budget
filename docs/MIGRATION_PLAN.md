# FinOps Tur — Migration Plan (REVIZE — ADR Tabanlı)

> **Kaynak:** `/Users/timurselcukturan/Uygulamalar/Budget` (mevcut) — `docs/architecture.md` ADR-0001 → ADR-0006 okundu
> **Tarih:** 2026-04-17 (revize)
> **Sahibi:** Timur Selçuk Turan
> **Uygulayıcı:** Claude Code (sıralı faz çalıştırma)
> **Dil:** Türkçe, TDD zorunlu, CLAUDE.md Day-1 prensipleri bağlayıcı

---

## 0. Yönetici Özeti (Revize)

`docs/architecture.md` içindeki **ADR-0001 → ADR-0006** okunduktan sonra ilk planın materyal olarak eskidiği görüldü. Aslen "yapılacak" olarak işaretlenen S1–S6'nın büyük çoğunluğu **zaten üretilmiş** (77→86 unit test yeşil, 29 API endpoint, RLS + FORCE RLS, aylık audit partition şeması, onay state machine, TCMB senkronizasyonu, global exception + FluentValidation pipeline).

**Gerçek durum:** Proje **%65–70 tamamlanmış**. Geriye kalan iş iki ana blokta yoğunlaşıyor:

1. **Operasyonel kapanışlar** (ADR'lerin "Açık aksiyonlar" bölümleri) — ~2.5 gün
2. **Hâlâ yapılmamış özellik blokları** (Excel/PDF, Frontend, CI/CD, E2E) — ~10–11 gün

**Yeni takvim:** ~21 iş gününden **~13 iş gününe** düşüyor. Aşağıdaki tablo eskiyen planı gerçek ADR çıktılarına göre yeniden haritalandırır.

---

## 1. Gerçek Tamamlanma Durumu (ADR Referanslı)

| Alan | Durum | Kaynak |
|---|---|---|
| Stack + Clean Architecture 4 katman | ✅ Dondurulmuş | ADR-0001 §2.1–2.4 |
| Day-1 ilkeleri (8 madde) | ✅ Karar dondu | ADR-0001 §3 |
| Central Package Management + kritik pin'ler (EF 10.0.6, Npgsql 10.0.1, Testcontainers 4.11.0, FluentAssertions 6.12.2) | ✅ | ADR-0002 §2.1 |
| Multi-tenant iki katmanlı izolasyon (EF query filter + PostgreSQL RLS `FORCE`) | ✅ | ADR-0002 §2.2 |
| `NULLIF(current_setting(...))::INT` default-deny RLS policy | ✅ | ADR-0002 §2.2 |
| `TenantConnectionInterceptor` + `is_local=false` + `AsyncLocal` scope | ✅ | ADR-0002 §2.3 |
| `budget_app` non-superuser role (NOSUPERUSER NOBYPASSRLS) | ✅ | ADR-0002 §2.4 |
| `audit_logs` aylık partition + INSERT+SELECT only role grant | ✅ (şema) | ADR-0002 §2.5 |
| `EXCLUDE USING gist` — aktif bütçe versiyon tekilliği | ✅ | ADR-0002 §2.6 |
| Testcontainers + Respawn + iki connection string (superuser + budget_app) | ✅ | ADR-0002 §2.7 |
| 6 baseline integration test (schema/seed/EXCLUDE/RLS cross-tenant/default-deny/partition) | ✅ | ADR-0002 §2.7 |
| ASP.NET Identity (`IdentityUser<int>`) + OpenIddict 7.4.0 (string-keyed) | ✅ | ADR-0003 §2 |
| `UserCompany` many-to-many + `IsDefault` flag | ✅ | ADR-0003 §2 |
| OpenIddict passthrough mode + `/connect/token|userinfo|authorize|logout` | ✅ | ADR-0003 §2 |
| Access token 30dk / Refresh token 14g | ✅ | ADR-0003 §2 |
| `company_id` claim + `TenantResolutionMiddleware` entegrasyonu | ✅ | ADR-0003 §2 |
| `AddIdentityAndOpenIddict` migration (InitialSchema üstünde) | ✅ | ADR-0003 §2 |
| 7 domain entity + factory method pattern + `TenantEntity` türevi | ✅ | ADR-0004 §2.1 |
| 4-kolonlu FX (`AmountOriginal`, `CurrencyCode`, `AmountTryFixed`, `AmountTrySpot`) | ✅ | ADR-0004 §2.2 |
| `KpiCalculationEngine` — 16 KPI + HHI konsantrasyon + `SafeRatio()` banker's rounding | ✅ | ADR-0004 §2.3 |
| FluentValidation validator'lar + DI kaydı | ✅ | ADR-0004 §2.4 |
| 77 → 86 unit test yeşil (golden scenario KPI dahil) | ✅ | ADR-0004 §4 / ADR-0006 §4 |
| 29 API endpoint / 6 controller (Customers, BudgetEntries, Expenses, SpecialItems, Dashboard, BudgetVersions) | ✅ | ADR-0005 §2.2 |
| Onay akışı endpoint'leri (submit/approve-dept/approve-finance/approve-cfo/activate/reject/archive) + rol policy | ✅ | ADR-0005 §2.3 |
| `IExceptionHandler` + RFC 9457 ProblemDetails + exception→HTTP mapping | ✅ | ADR-0006 §2.1 |
| FluentValidation `IAsyncActionFilter` pipeline | ✅ | ADR-0006 §2.2 |
| `ITcmbFxService.SyncRatesAsync(DateOnly)` + USD/EUR/GBP + banker's rounding 4 ondalık + idempotent | ✅ | ADR-0006 §2.3 |
| `SegmentsController` + `FxRatesController` | ✅ | ADR-0006 §2.4 |

**Alt satır:** S1–S5 ve S6'nın TCMB kısmı bitti. 3 migration, 6 controller + 29 endpoint, 86 unit test, 6 integration test baseline ayakta.

---

## 2. Gerçek Kalan İş — ADR'lerin "Açık Aksiyonlar" + Henüz Yapılmamışlar

### 2.1. Operasyonel kapanış kalemleri (ADR açık aksiyonları)

| # | Konu | Kaynak | Efor |
|---|---|---|---|
| 1 | `AuditPartitionMaintenanceJob` — Hangfire recurring (ayın 1'i 02:00 TR) + 84 aydan eski partition drop | ADR-0002 §5 | 0.5 gün |
| 2 | TCMB FX Hangfire recurring job — iş günleri 15:45 TR, 3 retry + fallback + Seq WARN | ADR-0002 §5 / ADR-0006 §4 | 0.5 gün |
| 3 | `ALTER ROLE budget_app PASSWORD '${BUDGET_APP_DB_PASSWORD}'` production deploy step | ADR-0002 §5 / ADR-0003 §5 | 0.25 gün |
| 4 | Production X509 (encryption + signing) — Railway secret store'dan yükleme | ADR-0003 §5 | 0.5 gün |
| 5 | Production `budget-tracker-spa` client create script (dev-only seed'i değiştir) | ADR-0003 §5 | 0.25 gün |
| 6 | Audit log entegrasyonu — login/logout/register olayları `AuditLog`'a | ADR-0003 §5 | 0.5 gün |

**Alt toplam:** **~2.5 gün**

> **Ertelenmiş (plandan çıkartıldı, release sonrası):** Argon2id PoC + benchmark (S13+), MFA/TOTP (S11+), EF query filter + RLS plan analizi k6 yük testinde, FluentAssertions OSS fork takibi.

### 2.2. Henüz başlanmamış özellik blokları

| # | Konu | Mevcut Durum | Efor |
|---|---|---|---|
| A | **Hangfire kurulumu** — `UseHangfirePostgreSqlStorage` + dashboard + OpenIddict role-based authorization filter + `/hangfire` endpoint | Paket referansı yok | 0.5 gün |
| B | **Seq entegrasyonu** — Serilog `Seq` sink + `docker-compose.dev.yml`'a Seq container (localhost:5341) + health check `/health/live`, `/health/ready` | Serilog kuruldu, sink yok | 0.5 gün |
| C | **Excel import** (ClosedXML) — 3 sheet template (Segment, ExpenseCategory, BudgetEntry), preview + commit endpoint, `import_errors` tablo, 50 satır round-trip testi | `IExcelImportService` interface sadece | 1.5 gün |
| D | **Excel export** (ClosedXML) — P&L 12 ay × kategori, varyans raporu, kapalı dönem read-only kilidi | `IExcelExportService` interface sadece | 1 gün |
| E | **PDF raporu** (QuestPDF) — Executive summary (header + 4 KPI + chart placeholder + KVKK damgası) | `IPdfReportService` interface sadece | 0.5 gün |
| F | **Frontend baseline** — React 19 + Vite + Tailwind 4 + Zustand + TanStack Query v5 + AG-Grid Community + Chart.js 4.4 + react-chartjs-2 5.3 + OIDC code+PKCE + 6 sayfa MVP (login, dashboard, scenarios, budget-entries, approvals, reports/pnl) + `MoneyInput` TR format + `useClipboardRange.ts` | Sadece `App.tsx` + `main.tsx` iskeleti | 5 gün |
| G | **E2E Playwright** — 5 kritik akış (login, versiyon oluştur→submit→approve, Excel import, varyans export, audit log filter) | Kurulum yok | 1 gün |
| H | **Golden scenario fixture** — `golden_scenario_baseline.json` (master spec §11.5) + `[Category("GoldenScenario")]` CI release gate | Dosya yok | 0.5 gün |
| I | **CI/CD** — `.github/workflows/ci.yml` (backend build+test+coverage, frontend lint+build, OWASP ZAP baseline, `dotnet list package --vulnerable`) + `deploy.yml` (develop→dev, main→staging→prod manuel gate) + Railway `railway.toml` (api, web, Postgres, Seq add-on) + rollback runbook | Yok | 1 gün |
| J | **Dokümantasyon kapanışı** — `README.md` quickstart, `docs/user-guide.md`, `docs/admin-guide.md`, `docs/runbook.md`, `docs/kvkk-uyum.md` (data inventory, retention, imha, DPIA özeti), `CHANGELOG.md` sürüm notları | `architecture.md` + `TECH_STACK.md` mevcut | 0.5 gün |

**Alt toplam:** **~11 gün**

### 2.3. Birleştirilmiş yeni takvim

| Faz | Kapsam | Süre |
|---|---|---|
| **F1 — Operasyonel kapanış** | 2.1'deki 6 kalem | 2.5 gün |
| **F2 — Hangfire + Seq altyapısı** | A + B | 1 gün |
| **F3 — Excel / PDF** | C + D + E | 3 gün |
| **F4 — Frontend baseline** | F | 5 gün |
| **F5 — Test kapanışı + E2E** | G + H | 1.5 gün |
| **F6 — CI/CD + Dokümantasyon** | I + J | 1.5 gün |
| **Toplam** | | **~14.5 iş günü (≈ 3 hafta)** |

---

## 3. Fazlar — Claude Code için Detay

### FAZ 1 — Operasyonel Kapanış (2.5 gün)

**Amaç:** ADR-0002 §5 ve ADR-0003 §5'teki açık aksiyonları kapat.

**İşler:**
1. **Hangfire kurulumu ön-koşul** (F2 başlamadan Hangfire çekirdeği gerekli) — sadece paket + `UseHangfirePostgreSqlStorage` + minimum DI.
2. `AuditPartitionMaintenanceJob` — `AddOrUpdate` recurring, `Cron.Monthly(1, 2, 0)`, ileri 3 ay partition oluştur + 84 aydan eski partition DROP. Integration test: dry-run + invariant assertion.
3. `TcmbFxSyncJob` — `Cron.DayOfWeek(Monday-Friday, 15, 45, TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul"))`, 3 retry + `Polly` exponential, fallback önceki günün kuru + Seq `WARN`.
4. `IAuditLogger` — `Register` / `SignIn` / `SignOut` controller aksiyonlarına bağla. Test: 3 olayın `audit_logs` tablosunda görünmesi.
5. Production release script taslağı (`infra/release/rotate-db-password.sh`) — `ALTER ROLE budget_app PASSWORD` Railway env'dan alır. README'ye adım.
6. `infra/release/create-prod-oidc-client.cs` — `budget-tracker-spa` client create tool. README'ye komut.
7. X509 cert yükleyici — `appsettings.Production.json`'da `Authentication:Certificates:Encryption` + `Signing` path veya secret. Railway volume mount talimatı.

**Kabul:**
- 2 Hangfire recurring job `/hangfire` dashboard'da listeli.
- Login/logout/register 3 event `audit_logs`'a düşüyor, cross-month partition'a doğru satır.
- Release runbook'unda şifre rotation ve client seed adımı adım adım yazılı.

**Ajan:** `silent-failure-hunter` + `security-reviewer` + `database-reviewer`

---

### FAZ 2 — Hangfire UI + Seq Logging + F1 İzleme (1.5 gün)

**Amaç:** Gözlemlenebilirlik + background operation UI'ı + F1 review ajanlarının "HIGH → ertelendi" notları.

**İşler:**
1. `HangfireDashboardAuthorizationFilter` — OpenIddict JWT ile Admin/GroupCfo rolü check.
2. Serilog `Seq` sink + dev `docker-compose.dev.yml`'a Seq container (`datalust/seq:latest`, 5341, 8081).
3. Health check: `/health/live` (process), `/health/ready` (DB + Hangfire storage).
4. Structured log enricher: `tenant_id`, `user_id`, `request_id` otomatik.
5. PII masking enricher: `EmailAddress`, `TaxId`, `PhoneNumber` → `****` (Serilog `Destructure.ByTransforming`).
6. **`AuditLogger` → `IDbContextFactory<ApplicationDbContext>` geçişi** _(F1 csharp-reviewer HIGH)_. Audit yazımı scoped DbContext'i paylaşmayacak; her audit call kendi kısa ömürlü context'ini açıp kapatacak. Uncommitted iş verisinin audit `SaveChangesAsync`'ine "binme" riski kapanır.
7. **`TenantConnectionInterceptor` sync-over-async düzeltmesi** _(F1 csharp-reviewer HIGH; pre-existing kod)_. Mevcut `ConnectionOpened` override'ındaki `.GetAwaiter().GetResult()` deadlock riski — `ConnectionOpenedAsync` async override'a taşınacak. Hangfire job'ları ve auth flow'u bu path'i aktif kullandığından F2 kapsamında gerekli.
8. **ADR-0007 finalizasyonu** — F1+F2 birleşik "Hangfire + Seq + Operasyonel Kapanış" kararı yazılır. Referanslar: CLAUDE.md §Bilinen Tuzaklar #2 (dashboard auth), #3 (TCMB drift — F1'de kapandı), #5 (audit partition overflow — F1'de kapandı). F1 CHANGELOG girdisi ADR'de "kanıt kaydı" olarak atıfla belirtilir.

**Kabul:**
- `/hangfire` → Admin 200, anonim 401.
- Seq UI'da yapılandırılmış log (tenant_id ve user_id ile filtrelenebilir).
- `/health/ready` — Postgres yokken 503, varken 200.
- `AuditLoggerIntegrationTests` yeni senaryo: aynı scope'ta ongoing business transaction'ın rollback'i audit kaydını etkilemiyor (context izolasyonu kanıtı).
- `TenantConnectionInterceptor` integration testi async yoldan çalışıyor; eski sync-over-async çağrısı analyzer ile engelli.
- `docs/architecture.md` içinde **ADR-0007 — Hangfire + Seq + Operasyonel Kapanış** onaylı ("Accepted") state'te.

**Ajan:** `security-reviewer`, `code-reviewer`, `csharp-reviewer`

---

### FAZ 3 — Excel Import/Export + PDF (3 gün)

**Amaç:** Mevcut interface'leri doldur + F2'den taşınan log hijyeni.

**İşler:**
1. **Import şablonu** (`docs/templates/budget-import-template.xlsx`) — 3 sheet. `ClosedXML.Excel.XLWorkbook` ile yazma.
2. **ExcelImportService** — Preview endpoint (sadece validation raporu), Commit endpoint (transactional + row-level error toleransı → `import_errors` tablosu). Türkçe hata mesajları.
3. **Tenant-aware stream limiti** — tenant başına max **50 000 satır** veya **10 MB** upload. Aşılırsa 422 `ImportFileTooLarge`; `audit_logs` event `IMPORT_REJECTED_LIMIT` ile yazılır. `IFormFile.Length` ön-kontrol + `XLWorkbook` satır sayımı post-kontrol.
4. **ExcelExportService** — P&L (12 ay × kategori), Varyans (bütçe vs gerçek), kapalı dönem read-only kilidi.
5. **PdfReportService** (QuestPDF) — Executive summary (header + 4 KPI + 2 chart placeholder + footer KVKK damgası). **Türkçe font subsetting:** Lato TTF `src/BudgetTracker.Infrastructure/Resources/Fonts/` altında embed; QuestPDF `FontManager.RegisterFont` ile yüklenir, subset yalnız kullanılan glyph'ler (PDF boyut <200 KB hedef).
6. `ReportsController` endpoint'leri (rol policy: FinanceManager, CFO).
7. Integration test: 50 satır Excel → 50 DB row + 50 audit entry. PDF binary byte count > 0, Lato fontu subset gömülü, ğ/ü/ş/ı/ç/ö glyph'leri PDF bytes'ında var (PdfPig ile inspection).
8. **Log hijyeni** _(F2 security-reviewer LOW carry-over)_ — `Log.Fatal(ex, ...)` ve kullanıcıya dönen ProblemDetails mesajlarında connection string + cert path sızmasını engellemek için `ExceptionMessageSanitizer` helper. 3 regex mask (Npgsql connection fragments, file paths, OpenIddict secret). Unit test.

**Kabul:**
- `docs/templates/` altında 2 şablon.
- 50-row round-trip testi yeşil.
- 50 001 satırlık dosya upload'u 422 ile reddedilir, audit'e düşer.
- PDF açıldığında Türkçe karakterler doğru, KVKK damgası footer'da, font subset kanıtı.
- `ExceptionMessageSanitizer` connection string içeren test exception mesajını temizler.
- ADR-0008 "Excel/PDF reporting + tenant stream limits + font strategy" F3 başında **Önerildi**, F3 sonunda **Kabul edildi** (ince ayar #1 disiplini).

**Ajan:** `csharp-reviewer`, `code-architect`, `security-reviewer` (tenant stream limit + log redaction için)

---

### FAZ 4 — Frontend Baseline (5 gün)

**Amaç:** `client/` iskeletini çalışır MVP'ye çevir.

**İşler:**
1. `package.json` — React 19, Vite 6, TypeScript 5.6+, Tailwind 4, Zustand 5, TanStack Query 5, React Router 7, AG-Grid Community, Chart.js 4.4 + react-chartjs-2 5.3, React Hook Form + Zod, date-fns, i18next, Lucide React.
   > **Not:** ADR-0001'de frontend chart kütüphanesi **Recharts** olarak geçiyor, CLAUDE.md'de **Chart.js**. CLAUDE.md bağlayıcı olduğundan Chart.js + react-chartjs-2 uygulanacak; ADR-0001'e "superseded" notu düşülüp ADR-0007 açılacak.
2. Feature-based klasör yapısı (CLAUDE.md'deki öneri + `features/auth|dashboard|scenarios|budget-entries|approvals|variance|reports` + `shared/api|ui|stores|i18n|lib` + `app/`).
3. OIDC code + PKCE flow (OpenIddict server), token interceptor, 401 retry, 403 `forbidden.tsx`.
4. **MVP sayfaları:**
   - `/login` — OIDC redirect
   - `/dashboard` — 4 KPI kartı + Chart.js trend grafiği
   - `/scenarios` — liste + detay + create wizard
   - `/budget-entries` — AG-Grid inline edit + `useClipboardRange.ts` (Excel tarzı range copy-paste)
   - `/approvals` — pending inbox + decision (Submit/Approve/Reject butonları)
   - `/reports/pnl` — 12 aylık tablo + drill-down panel
5. `MoneyInput` — TR format (`1.234,56`), `PeriodPicker` (yıl + ay).
6. Anti-template design (CLAUDE.md `web/design-quality` kuralı — default Tailwind/shadcn görünümünden kaç).
7. Performance bütçesi: LCP < 2.5s, INP < 200ms, JS bundle < 300kb (app), < 150kb (landing/login).
8. **Cookie hardening + Hangfire dashboard CSRF** _(F2 security-reviewer MEDIUM carry-over)_ — OpenIddict cookie'sini `SameSite=Strict`'e almak SPA redirect akışını etkileyebilir; F4 SPA ile birlikte `/connect/authorize` → SPA redirect path'ini uçtan uca test et. Strict uyumluysa `AuthenticationExtensions.AddCookie` güncellenir; değilse `/hangfire` için ayrı anti-CSRF token (header-based double-submit) yazılır. Seçimin gerekçesi ADR-0009'a kayıt.
9. **i18n başlangıç: TR default + EN alias tabanı** _(F3 ADR-0008 §2.4 hedging)_ — `i18next` + `react-i18next` kurulumu, `shared/i18n/tr.json` + `shared/i18n/en.json`. Excel başlık dili anahtarları ilk basamak olarak. Muhasebe teyidi gelirse bu alias layer kullanılmayabilir; gelmezse ADR-0008 §2.4 "Reddedildi"ye döner ve Excel şablonu TR/EN dual column generator'a geçer (≈0.5 gün ek, §11 maddesi olarak aşağıda).
10. **Muhasebe §2.4 teyit işleme yolu** — Teyit gelmişse ADR-0008 §2.4 "fully accepted" commit; gelmemişse: (a) `ExcelExportService` başlık satırında `i18next.t('budget.headers.customer')` kullanan alternatif yol, (b) CLAUDE.md "Açık Doğrulama #5" maddesi F4 ayrı commit'te kaldırılsın/güncellensin. ADR-0008 §2.4 durumu F4 sonunda final'ize.

**Kabul:**
- `pnpm build` → bundle < 300kb (app).
- 6 sayfa navigable, 401 → login, 403 → forbidden.
- `pnpm lint` yeşil, TS strict mode.
- Lighthouse Performance ≥ 90.
- Cookie `SameSite` kararı ADR-0009'da belgelenmiş + `/hangfire` CSRF test'i (cross-origin form POST reddedilir).
- i18next TR default aktif, EN anahtarları TR'nin aynasında (key count eşitliği test'te assert edilir).
- ADR-0008 §2.4 F4 sonunda final statüsünde (teyit geldiyse fully accepted, gelmediyse alias aktif).

**Ajan:** `typescript-reviewer` (ZORUNLU her commit), `code-reviewer`, `security-reviewer` (cookie/CSRF için)

---

### FAZ 5 — Golden Scenario + E2E Playwright (1.5 gün)

**Amaç:** Regression güvencesi + uçtan uca kritik akışlar.

**İşler:**
1. `tests/BudgetTracker.IntegrationTests/GoldenScenarioTests.cs` — master spec §11.5 referans değerleri, `[Trait("Category","GoldenScenario")]`.
2. `tests/BudgetTracker.IntegrationTests/Fixtures/golden_scenario_baseline.json` — input + beklenen 16 KPI değeri.
3. `client/tests/e2e/` — Playwright, 5 akış:
   - Login → dashboard görüntülenir
   - Versiyon oluştur → satır ekle → submit → dept approve → CFO approve → activate
   - Excel import → preview → commit → row count eşleşir
   - Varyans raporu aç → Excel export → dosya download edilir
   - Audit log sayfası → filter uygula (tenant, user, date range)

**Kabul:**
- `dotnet test --filter Category=GoldenScenario` yeşil; CI'da ayrı job.
- 5 Playwright senaryosu CI'da yeşil (headless + traces on failure).

**Ajan:** `tdd-guide`, `pr-test-analyzer`, `e2e-runner`

---

### FAZ 6 — CI/CD + Dokümantasyon (1.5 gün)

**Amaç:** Tek push → otomatik dev deploy + release teslimi.

**İşler:**
1. `.github/workflows/ci.yml`:
   - Job 1: backend — build + test + coverage (coverlet + ReportGenerator HTML artifact).
   - Job 2: frontend — lint + build + bundle size check.
   - Job 3: security — OWASP ZAP baseline + `dotnet list package --vulnerable`.
   - Job 4: golden scenario — sadece `main`'e merge'de.
2. `.github/workflows/deploy.yml`:
   - `develop` → Railway dev (auto).
   - `main` → Railway staging (auto) → prod (manuel approval, 1 reviewer).
3. `railway.toml` — 2 servis (api, web) + Postgres 16 add-on + Seq add-on + health check probe.
4. Secret konfigürasyonu: Railway env → `ASPNETCORE_*`, `OpenIddict__*`, `ConnectionStrings__*`, `Tcmb__*`, `BUDGET_APP_DB_PASSWORD`.
5. `docs/runbook.md` — incident, rollback (< 3dk), DB restore, partition recovery.
6. `docs/user-guide.md`, `docs/admin-guide.md`, `docs/kvkk-uyum.md` (data inventory, retention, imha, DPIA özeti).
7. `README.md` quickstart (clone → docker compose → pnpm dev < 10 dk).
8. `CHANGELOG.md` — tüm fazları conventional commit ile kayıt.

**Kabul:**
- PR açıldığında CI 4 job yeşil.
- `develop` push → 5 dk içinde dev URL güncel.
- `main` push → staging otomatik, prod manuel gate.
- README'den clone → lokal çalışır < 10 dk (manuel test).
- KVKK dosyası hukuk tarafıyla paylaşıma hazır.

**Ajan:** `code-reviewer`, `doc-updater`

---

## 4. Çıkartılan / Ertelenmiş Kalemler

Planın ilk versiyonunda vardı, bu revizyonda çıkartıldı:

| Kalem | Gerekçe |
|---|---|
| "RLS & Multi-tenant sağlamlaştırma" (eski S2) | ADR-0002 §2.2–2.7 ile zaten tamamlanmış; 6 baseline integration test yeşil |
| "Approval workflow state machine" (eski S5) | ADR-0004 `BudgetApproval.Approve()/Reject()` + ADR-0005 §2.3 endpoint'leri mevcut |
| "TCMB FX servis implementasyonu" (eski S6 içinde) | ADR-0006 §2.3 `ITcmbFxService.SyncRatesAsync` yazılmış; sadece Hangfire'a bağlama kaldı (F1) |
| "Global exception + FluentValidation pipeline" (eski S6 içinde) | ADR-0006 §2.1–2.2 yazılmış |
| "Banker's rounding merkezi uygulaması" (eski S5) | `SafeRatio()` + KPI engine zaten `MidpointRounding.ToEven` kullanıyor (ADR-0004) |
| "Audit log partition şeması" (eski S3) | ADR-0002 §2.5 ile yapılmış; sadece maintenance job kaldı (F1) |
| Argon2id PoC, MFA/TOTP | ADR-0003 §5 — S11+ / S13+ fazlarına ertelendi, MVP sonrası |

---

## 5. Açık Muhasebe Doğrulamaları (Sprint başında sor)

Bu maddeler bütçe içerik/logic doğrulaması, teknik plan değil:

1. "Holding Giderleri" sınıfı GENERAL mi EXTRAORDINARY mi?
2. "Amortisman" sınıfı → şu anda TECHNICAL; teyit?
3. "SGK Teşvik" segmenti operasyonel detay
4. Müşteri Konsantrasyon eşikleri (öneri: %30 uyarı / %50 kritik)
5. Excel şablon başlık dili (Türkçe sabit mi, TR/EN alias mı?)

---

## 6. Risk Haritası (Güncel)

| Risk | Etki | Önlem |
|---|---|---|
| RLS + EF GUC pooled connection sızıntısı | Cross-tenant data leak | `is_local=false` + `TenantConnectionInterceptor` integration test mevcut (ADR-0002 §2.3) |
| TCMB XML format drift | FX güncellenmez | Contract test + fallback önceki gün + Seq WARN + email notify (F1 + F2) |
| Audit partition atlarsa | INSERT fail, sistem durur | Hangfire recurring 3 ay ileri açar + monitoring alarm (F1) |
| AG-Grid clipboard range edge case | Kullanıcı Excel alışkanlığı bozulur | `useClipboardRange.ts` için 10 senaryo unit test (F4) |
| Frontend chart kütüphanesi Recharts vs Chart.js kararsızlığı | Uygulama kararı | CLAUDE.md Chart.js diyor → Chart.js seçildi, ADR-0007 ile Recharts "superseded" |
| Dev X509 cert restartta değişir | Token invalidasyonu | Production'da persistent cert + Railway secret store (F1) |
| `budget_app` dev şifresi migration'da | Prod'a sızarsa güvenlik açığı | F1 release script rotate ediyor + README adımları |

---

## 7. Claude Code Talimatı (Bu Dosyayı Ver)

```
Merhaba Claude Code. /Users/timurselcukturan/Uygulamalar/Budget projesi FinOps Tur
adlı bütçe platformudur. Mevcut CLAUDE.md dosyasındaki stack (Railway, .NET 10,
React 19, OpenIddict, Hangfire, Seq, PostgreSQL 16, Chart.js) DONDURULMUŞTUR.
Sapma yok.

Okunacak temel referanslar:
- CLAUDE.md (proje root)
- docs/architecture.md (ADR-0001 → ADR-0006 — mevcut durumun otoriter kaynağı)
- docs/MIGRATION_PLAN.md (bu dosya — kalan iş ve faz planı)

Bu MIGRATION_PLAN.md'deki fazları (F1 → F6) sıralı uygula, her fazı ayrı PR olarak
aç (feat/f1-operational-closure, feat/f2-hangfire-seq, feat/f3-excel-pdf, ...).

Her faz:
1. Önce plan sun, onay bekle (CLAUDE.md § "Kullanıcı açıkça istemedikçe commit yapma").
2. TDD: test önce.
3. csharp-reviewer (.NET değişikliğinde) ve typescript-reviewer (TS değişikliğinde)
   ZORUNLU ajan.
4. Hem ADR referansını hem de CLAUDE.md bilinen tuzaklarını (§Bilinen Tuzaklar) kontrol et.
5. Faz sonunda kabul kriterlerini madde madde doğrula; "Doğrulama" bloğunu Türkçe paylaş.
6. CHANGELOG.md + ilgili ADR (gerekirse yeni ADR) güncelle.

Şu anda FAZ 1 — Operasyonel Kapanış ile başla:
- AuditPartitionMaintenanceJob (ADR-0002 §5)
- TcmbFxSyncJob (ADR-0002 §5 + ADR-0006 §4)
- Login/logout/register audit entegrasyonu (ADR-0003 §5)
- Production password rotation + OIDC client create script'leri
- X509 cert yükleyici

Faz 1 biter bitmez Doğrulama bloğunu paylaş; Faz 2'ye geçmek için onay bekle.
```

---

## 8. Eski Plandan Kalan Miras Notu

İlk MIGRATION_PLAN.md (21 iş günü / 10 aşamalı) mevcut ADR'leri okumadan hazırlandığı için S1–S5 ve S6 TCMB kısmını "yapılacak" saymıştı. Bu revizyon sonrası plan **~14.5 iş günü** ve **6 faz**. Hazır altyapıyı yeniden yazma riski yok; üstüne çıkıp eksik katmanları (operasyonel kapanış + Excel/PDF + Frontend + CI/CD) kapatıyoruz.

**Eski efor tablosu (arşiv):** 21 gün → **Yeni:** 14.5 gün → **Kazanç:** ~6.5 gün (≈ 1.5 hafta).
