# BÜTÇE TAKİP YAZILIMI — BİRLEŞİK TEKNİK SPESİFİKASYON

> **Versiyon:** 2.0.0 (Birleşik)
> **Tarih:** 2026-04-15
> **Kaynaklar:** `BUTCE_TAKIP_YAZILIMI_SPEC.md` + `Butce_Analiz_ve_Yazilim_Plani.xlsx` + değerlendirme düzeltmeleri
> **Kapsam:** Tur Assist Grubu — Bütçe Planlama & Takip Platformu
> **Hedef:** Claude Code ile uçtan uca geliştirme için tek referans doküman

Bu doküman, önceki iki kaynağın teknik + fonksiyonel içeriğini birleştirir, tespit edilen kritik eksiklikleri düzeltir ve tutarsızlıkları giderir. ROI, faz takvimi, ekip yapısı, maliyet kalemleri bu dokümanda **bilinçli olarak yer almaz** — bunlar ayrı yönetim dokümanlarında tutulur. Bu doküman sadece **ne inşa edileceğini** ve **nasıl inşa edileceğini** tanımlar.

---

## İÇİNDEKİLER

- [BÖLÜM 0: AI Geliştirici Kuralları](#bölüm-0-ai-geliştirici-kuralları)
- [BÖLÜM 1: Proje Genel Bakış](#bölüm-1-proje-genel-bakış)
- [BÖLÜM 2: Teknik Mimari](#bölüm-2-teknik-mimari)
- [BÖLÜM 3: Veri Modeli ve Şema](#bölüm-3-veri-modeli-ve-şema)
- [BÖLÜM 4: Fonksiyonel Gereksinimler](#bölüm-4-fonksiyonel-gereksinimler)
- [BÖLÜM 5: Finansal Hesaplama Motoru](#bölüm-5-finansal-hesaplama-motoru)
- [BÖLÜM 6: API Endpoint Referansı](#bölüm-6-api-endpoint-referansı)
- [BÖLÜM 7: Güvenlik ve KVKK](#bölüm-7-güvenlik-ve-kvkk)
- [BÖLÜM 8: Test Stratejisi](#bölüm-8-test-stratejisi)
- [BÖLÜM 9: Performans ve SLO Hedefleri](#bölüm-9-performans-ve-slo-hedefleri)
- [BÖLÜM 10: Felaket Kurtarma](#bölüm-10-felaket-kurtarma)
- [BÖLÜM 11: Kaynak Excel Veri Yapısı](#bölüm-11-kaynak-excel-veri-yapısı)
- [BÖLÜM 12: Açık Kararlar](#bölüm-12-açık-kararlar)

---

## BÖLÜM 0: AI GELİŞTİRİCİ KURALLARI

Bu kurallar, projeyi geliştiren AI agent (Claude Code) tarafından **her adımda** uyulması zorunlu kurallardır. Her kural, ya tespit edilmiş bir üretim hatasından ya da kurumsal bir standart gereksiniminden doğar.

### 0.1 Mimari Kuralları

```
KURAL-001: Her dosya tek bir sorumluluk taşır (Single Responsibility).
KURAL-002: Backend katmanları: Controller → Service → Repository → Entity. Atlanmaz.
KURAL-003: Frontend katmanları: Page → Component → Hook → Service → Type. Atlanmaz.
KURAL-004: Business logic Controller veya Component içinde yazılmaz. Service katmanında olur.
KURAL-005: Veritabanı erişimi sadece Repository katmanından yapılır.
KURAL-006: Her API endpoint'i DTO kullanır. Entity doğrudan API response olarak dönmez.
KURAL-007: Cross-cutting concern'ler (logging, auth, validation) middleware/filter ile çözülür.
KURAL-008: Konfigürasyon hardcode edilmez. appsettings.json / environment variable kullanılır.
KURAL-009: Her modül kendi klasöründe izole edilir. Modüller arası bağımlılık interface üzerinden olur.
KURAL-010: Circular dependency yasaktır.
```

### 0.2 Kod Kalitesi Kuralları

```
KURAL-011: Public API'ler XML doc comment ile belgelenir. Internal method'lar için zorunlu değildir.
KURAL-012: Magic number/string yasaktır. Constant veya enum kullanılır.
KURAL-013: Null dönüş yerine Result<T> / Option pattern kullanılır (domain service'lerde).
KURAL-014: Try-catch sadece gerçek hata yönetimi gereken yerlerde kullanılır. Global exception handler zorunludur.
KURAL-015: Async method'lar "Async" suffix'i taşır ve CancellationToken kabul eder.
KURAL-016: String concatenation yerine string interpolation ($"") kullanılır.
KURAL-017: LINQ sorguları 3 satırı geçerse method syntax kullanılır.
KURAL-018: React component'leri 150 satırı geçmez. Geçerse alt component'lere bölünür.
KURAL-019: Her TypeScript tipi /types klasöründe tanımlanır. `any` yasaktır. `unknown` tercih edilir.
KURAL-020: CSS-in-JS / inline style yasaktır. Tailwind utility class kullanılır.
KURAL-021: Server state için TanStack Query, UI/client state için Zustand kullanılır. İkisi karıştırılmaz.
KURAL-022: Dosya uzunluğu üst sınırı: 400 satır (idealde 200-300). Üstü → modülere bölünür.
```

### 0.3 Güvenlik Kuralları

```
KURAL-023: SQL injection'a karşı tüm sorgular parameterized olur. Raw SQL sadece performans kritik aggregation'lar için, ve review'dan geçer.
KURAL-024: XSS'e karşı tüm kullanıcı girdileri sanitize edilir. dangerouslySetInnerHTML yasaktır.
KURAL-025: CORS policy production'da wildcard (*) içermez.
KURAL-026: JWT token'da hassas bilgi (şifre, kişisel veri) bulunmaz.
KURAL-027: Tüm API endpoint'leri varsayılan olarak [Authorize] ile korunur. [AllowAnonymous] istisnadır.
KURAL-028: Şifreler Argon2id veya bcrypt (cost≥12) ile hash'lenir.
KURAL-029: Rate limiting tüm public endpoint'lerde aktif olur.
KURAL-030: Audit log: kim, ne zaman, ne yaptı — her yazma operasyonunda append-only kaydedilir.
KURAL-031: KVKK uyumu: kişisel veri minimize edilir, sadece email + isim tutulur. Hassas finansal veri access log'a alınır, silme hakkı desteklenir.
KURAL-032: Secret'lar asla repo'da tutulmaz. GitHub Secrets / Azure Key Vault / HashiCorp Vault kullanılır.
```

### 0.4 Test Kuralları

```
KURAL-033: Her Service method'u için en az 1 unit test yazılır.
KURAL-034: Her API endpoint için en az 1 integration test yazılır.
KURAL-035: Finansal hesaplama fonksiyonları için regression fixture test suite zorunludur. Bkz. §8.3.
KURAL-036: Test coverage %80 altına düşmez (hesaplama modülü için %95 hedef).
KURAL-037: Test isimlendirme: MethodName_Scenario_ExpectedResult formatında.
KURAL-038: Mock framework: Backend NSubstitute, Frontend Vitest.
KURAL-039: Integration testleri Testcontainers + gerçek PostgreSQL 16 üzerinde koşar. SQLite in-memory YASAKTIR (JSONB uyumsuzluğu).
KURAL-040: E2E testler Playwright ile yazılır. Kritik akışlar: login, bütçe giriş, onay, dashboard, export.
KURAL-041: Her bug fix ile birlikte regression test eklenir.
KURAL-042: CI'da her PR'da tüm testler geçmeli. Kırık test ile merge yasaktır.
```

### 0.5 Git & CI/CD Kuralları

```
KURAL-043: Branch stratejisi: main → develop → feature/xxx, hotfix/xxx, release/xxx.
KURAL-044: Commit mesajı: Conventional Commits (feat, fix, docs, refactor, test, chore).
KURAL-045: Her feature branch tek bir iş birimi içerir. Develop'a squash merge yapılır.
KURAL-046: PR açmadan önce: lint pass, test pass, build pass zorunlu.
KURAL-047: CI pipeline: lint → typecheck → test → build → security scan → deploy (staging).
KURAL-048: Database migration'lar EF Core Migration ile yönetilir. Manuel SQL yasaktır.
KURAL-049: Şema değişiklikleri backwards-compatible olur (ADD COLUMN NULL veya default), breaking değişiklik 2 aşamada yapılır.
KURAL-050: Her deployment rollback planı ile birlikte yapılır.
KURAL-051: Semantic versioning (MAJOR.MINOR.PATCH).
KURAL-052: Secret'lar asla repo'da bulunmaz (KURAL-032 ile tutarlı).
```

### 0.6 Veri ve Cache Kuralları

```
KURAL-053: Tüm para tutarları Money value object olarak tutulur (amount + currency).
KURAL-054: Raw DECIMAL tutarın yanında currency_code olmadan kullanılması yasaktır.
KURAL-055: Tarih-saat değerleri TIMESTAMPTZ, UTC olarak saklanır; UI'da yerel saate çevrilir.
KURAL-056: Cache invalidation event-driven olur. TTL-only invalidation hesaplama cache'leri için yasaktır (kullanıcıya stale veri gösterir).
KURAL-057: Multi-tenancy: company_id Day 1'den itibaren TÜM işlem tablolarında bulunur. Tek şirket kullanımında dahi uygulanır.
KURAL-058: Immutability: onaylanmış bütçe versiyonları değiştirilemez. Değişiklik → yeni revizyon.
```

### 0.7 AI Agent Davranış Kuralları

```
KURAL-059: Yeni dosya oluşturmadan önce mevcut yapıyı oku ve anla. Tekrar yazmak yerine mevcut kodu genişlet.
KURAL-060: Her adımda ne yaptığını ve neden yaptığını kısa açıkla.
KURAL-061: Hata aldığında 3 denemeden fazla aynı yaklaşımı tekrarlama. Alternatif çözüm üret.
KURAL-062: Büyük dosyaları tek seferde yazmak yerine modüler parçalara böl.
KURAL-063: Veritabanı şemasını değiştirmeden önce mevcut migration'ları kontrol et.
KURAL-064: Yeni dependency eklemeden önce mevcut dependency'leri kontrol et.
KURAL-065: Her mantıksal iş birimi sonunda çalışan, test edilmiş, deploy edilebilir bir çıktı olur.
KURAL-066: Türkçe karakter (İ,Ğ,Ü,Ş,Ö,Ç) dosya adlarında ve identifier'larda kullanılmaz.
KURAL-067: Kullanıcı arayüzü metinleri Türkçe olur. Kod, yorum, commit, doc İngilizce olur.
KURAL-068: Her release sonunda CHANGELOG.md güncellenir.
```

---

## BÖLÜM 1: PROJE GENEL BAKIŞ

### 1.1 Problem Tanımı

Mevcut durumda bütçe yönetimi Excel dosyaları üzerinden yürütülüyor:

- Çok sayıda sheet, 89+ müşteri, 4 segment, 156+ satır ana bütçe
- Gerçek zamanlı takip yok; veriler manuel güncelleniyor
- Çoklu kullanıcı erişimi yok; tek Excel dosyası paylaşılıyor
- Otomatik raporlama yok; her rapor manuel hazırlanıyor
- Senaryo analizi kısıtlı; what-if için formül değiştirmek gerekiyor
- Veri tutarsızlığı riski (copy-paste hataları)
- Versiyon kontrolü zayıf; revizyonlar dosya adıyla takip ediliyor (örn. "Rev 7")
- Onay akışı yok; kimin neyi onayladığı belgelenmiyor

### 1.2 Hedef Ürün

Web tabanlı, gerçek zamanlı, çok kullanıcılı bütçe planlama ve takip platformu:

- Müşteri + segment bazlı, 12 aylık detayda bütçe yönetimi
- Çok revizyonlu versiyon sistemi (immutable snapshot + diff)
- Çok aşamalı onay akışı (Department → Finance → CFO)
- Çoklu para birimi desteği (TCMB kurları ile)
- Otomatik KPI dashboard (yönetici seviyesi)
- Bütçe vs. gerçekleşme sapma analizi (heatmap, waterfall)
- Erken uyarı sistemi (anomali tespiti, bütçe aşımı)
- Senaryo motoru (what-if, duyarlılık, stres testi)
- AI tahmin modülü (gelir/hasar projeksiyonu)
- Excel import/export (mevcut format desteği)
- Yönetim kurulu raporu otomatik üretimi (PDF/Excel)
- KVKK uyumlu, denetim izi tam
- Çoklu şirket desteği (multi-tenant, konsolidasyon hazır)

### 1.3 Ölçek

| Boyut | Değer |
|---|---|
| Müşteri sayısı | 89+ (genişleyebilir) |
| Segment sayısı | 4 (Sigorta, Otomotiv, Filo, Alternatif Kanallar) |
| Bütçe satır hacmi | ~43,000 (89 müşteri × 12 ay × 4 segment × 10 kalem) |
| Eş zamanlı kullanıcı | 50+ |
| Gider kalem sayısı | ~20 (hiyerarşik) |
| Veri hacmi (yıllık) | <1 GB |

Bu ölçek **küçük-orta** kategorisine girer; mimari kararlar buna göre alınmıştır (bkz. §2).

---

## BÖLÜM 2: TEKNİK MİMARİ

### 2.1 Mimari Prensibi

Sistemin veri hacmi (~43K satır, <1 GB, 50 kullanıcı) **aşırı mühendisliği haklı çıkarmaz**. Mimari kararlar iki prensibe dayanır:

1. **Minimum viable complexity:** Her bileşen somut bir gereksinimden doğar, "ileride lazım olur" ile eklenmez.
2. **Kurumsal hazır olma:** Versiyonlama, onay akışı, FX, audit, multi-tenancy, KVKK — bunlar sonradan eklenmesi pahalı olduğu için Day 1'den hazır tutulur.

### 2.2 Teknoloji Stack

| Katman | Teknoloji | Versiyon | Gerekçe |
|---|---|---|---|
| Backend API | .NET | **10 LTS** | Kasım 2025'te GA. .NET 9 STS (Mayıs 2026'da destek biter); .NET 10 LTS Kasım 2028'e kadar destekli. Kurumsal standart, performans, EF Core 10 desteği. |
| Frontend | React + TypeScript | 19 / 5.x | Modern UX, geniş ekosistem |
| CSS Framework | Tailwind CSS | 4.x | Utility-first, tutarlı tasarım |
| Client State | Zustand | 5.x | Minimal, UI state için |
| Server State | TanStack Query | 5.x | Stale-while-revalidate, cache yönetimi |
| Data Grid | AG-Grid Community (veya Handsontable) | Son | Spreadsheet-like bütçe giriş UI |
| Chart Library | Recharts | 2.x | React-native, responsive |
| Veritabanı | PostgreSQL | 16+ | JSONB, pgaudit, güçlü analitik |
| ORM | Entity Framework Core | 9+ | Type-safe, migration |
| Auth | **Keycloak (self-hosted)** | 25+ | SSO, MFA, KVKK veri lokalizasyonu, vendor-lock yok |
| Excel I/O (Backend) | ClosedXML / EPPlus | Son | Mevcut Excel formatı desteği |
| Excel I/O (Frontend) | ExcelJS | 4.x | Client-side preview ve doğrulama |
| PDF Export | QuestPDF | Son | .NET native, şablon desteği |
| Background Jobs | Hangfire | Son | Scheduled sync, alert evaluation, report generation |
| Hosting | Azure Turkey Region (veya on-prem Türkiye) | - | KVKK veri lokasyonu zorunluluğu |
| Container | Docker + Docker Compose (dev/staging) | - | Dev-prod parity |
| CI/CD | GitHub Actions | - | Lint → test → build → scan → deploy |
| Monitoring | Serilog → Seq (log) + Prometheus → Grafana (metrik) | - | Structured log + metrics |
| Error Tracking | Sentry (self-hosted) | - | KVKK nedeniyle self-hosted |
| API Docs | Swagger / OpenAPI 3 | - | Otomatik dokümantasyon |

### 2.3 Stack'ten Çıkarılanlar ve Gerekçeleri

Aşağıdaki teknolojiler ilk sürümde **bilinçli olarak kapsam dışıdır**:

| Teknoloji | Ret Gerekçesi | Ne zaman eklenir? |
|---|---|---|
| Redis | 43K satır için PostgreSQL + TanStack Query yeterli. Cache invalidation karmaşıklığı maliyeti artırır. | API p95 latency > 300ms olduğunda |
| SignalR (real-time) | 50 kullanıcı, günlük veri girişi — WebSocket overkill. TanStack Query polling yeter. | 10+ kullanıcı aynı bütçe üzerinde concurrent çalıştığında |
| Ayrı Python/FastAPI servisi | İlk sürüm ML içermez. Tahmin eklendiğinde ayrı servis kurulur. | AI tahmin modülü geliştirildiğinde |
| Azure AD B2C | Vendor lock-in; KVKK için veri lokasyonu kısıtlaması var. Keycloak self-hosted tercih edildi. | (eklenmeyecek) |
| Azure Blob Storage | Dosya hacmi düşük; DB'de bytea veya local storage yeterli. | Raporlama arşivi 10 GB'ı aştığında |

### 2.4 Klasör Yapısı

```
budget-tracker/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Lint → Test → Build
│       ├── cd-staging.yml              # Staging deploy
│       └── cd-production.yml           # Production deploy
├── docs/
│   ├── BUTCE_TAKIP_YAZILIMI.md         # Bu doküman
│   ├── architecture.md                 # Mimari karar kayıtları (ADR)
│   ├── api-reference.md                # API detay dokümantasyonu
│   └── database-schema.md              # DB şema detayı
├── src/
│   ├── BudgetTracker.Api/              # ASP.NET Web API
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── BudgetController.cs
│   │   │   ├── BudgetVersionController.cs
│   │   │   ├── ApprovalController.cs
│   │   │   ├── DashboardController.cs
│   │   │   ├── CustomerController.cs
│   │   │   ├── ExpenseController.cs
│   │   │   ├── VarianceController.cs
│   │   │   ├── ScenarioController.cs
│   │   │   ├── AlertController.cs
│   │   │   ├── ReportController.cs
│   │   │   ├── ImportExportController.cs
│   │   │   ├── FxRateController.cs
│   │   │   └── AdminController.cs
│   │   ├── Middleware/
│   │   │   ├── ExceptionMiddleware.cs
│   │   │   ├── AuditMiddleware.cs
│   │   │   ├── CorrelationIdMiddleware.cs
│   │   │   ├── TenantResolverMiddleware.cs
│   │   │   └── RateLimitMiddleware.cs
│   │   ├── Filters/
│   │   │   └── ValidationFilter.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   │
│   ├── BudgetTracker.Core/             # Domain Layer
│   │   ├── Entities/
│   │   │   ├── Company.cs
│   │   │   ├── User.cs
│   │   │   ├── UserSegment.cs
│   │   │   ├── Segment.cs
│   │   │   ├── Customer.cs
│   │   │   ├── BudgetYear.cs
│   │   │   ├── BudgetVersion.cs
│   │   │   ├── BudgetEntry.cs
│   │   │   ├── BudgetApproval.cs
│   │   │   ├── ActualEntry.cs
│   │   │   ├── ExpenseCategory.cs
│   │   │   ├── ExpenseEntry.cs
│   │   │   ├── SpecialItem.cs
│   │   │   ├── FxRate.cs
│   │   │   ├── Scenario.cs
│   │   │   ├── AlertRule.cs
│   │   │   ├── AlertInstance.cs
│   │   │   └── AuditLog.cs
│   │   ├── Enums/
│   │   │   ├── SegmentType.cs
│   │   │   ├── EntryType.cs
│   │   │   ├── VersionStatus.cs
│   │   │   ├── ApprovalStage.cs
│   │   │   ├── ApprovalDecision.cs
│   │   │   ├── AlertSeverity.cs
│   │   │   └── UserRole.cs
│   │   ├── Interfaces/
│   │   │   ├── ICustomerRepository.cs
│   │   │   ├── IBudgetRepository.cs
│   │   │   ├── IBudgetVersionRepository.cs
│   │   │   ├── IApprovalRepository.cs
│   │   │   ├── IExpenseRepository.cs
│   │   │   ├── IFxRateRepository.cs
│   │   │   ├── IDashboardService.cs
│   │   │   ├── IScenarioService.cs
│   │   │   ├── IImportExportService.cs
│   │   │   ├── IAuditService.cs
│   │   │   └── ITenantContext.cs
│   │   └── ValueObjects/
│   │       ├── Money.cs                # Amount + Currency
│   │       ├── Percentage.cs
│   │       └── DateRange.cs
│   │
│   ├── BudgetTracker.Application/      # Business Logic Layer
│   │   ├── Services/
│   │   │   ├── BudgetService.cs
│   │   │   ├── BudgetVersionService.cs
│   │   │   ├── ApprovalWorkflowService.cs
│   │   │   ├── DashboardService.cs
│   │   │   ├── CustomerAnalysisService.cs
│   │   │   ├── ExpenseService.cs
│   │   │   ├── VarianceAnalysisService.cs
│   │   │   ├── ScenarioService.cs
│   │   │   ├── AlertService.cs
│   │   │   ├── FxConversionService.cs
│   │   │   ├── ImportExportService.cs
│   │   │   ├── ReportService.cs
│   │   │   └── AuditService.cs
│   │   ├── Calculations/               # Finansal hesaplama motoru
│   │   │   ├── KpiCalculator.cs
│   │   │   ├── RatioCalculator.cs
│   │   │   ├── VarianceCalculator.cs
│   │   │   └── ScenarioCalculator.cs
│   │   ├── DTOs/
│   │   │   ├── Request/
│   │   │   └── Response/
│   │   ├── Mapping/
│   │   │   └── MappingProfile.cs
│   │   └── Validators/
│   │       └── ...
│   │
│   ├── BudgetTracker.Infrastructure/   # Data Access Layer
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── TenantQueryFilter.cs    # Global filter for company_id
│   │   │   └── Migrations/
│   │   ├── Repositories/
│   │   │   └── ...
│   │   ├── ExcelParsers/
│   │   │   ├── IExcelParser.cs
│   │   │   ├── Butce2026Parser.cs
│   │   │   ├── TurAssistKzParser.cs
│   │   │   ├── DagitimAnahtariParser.cs
│   │   │   └── ParserRegistry.cs
│   │   ├── ExternalServices/
│   │   │   ├── TcmbFxRateService.cs    # TCMB kur entegrasyonu
│   │   │   ├── EmailService.cs
│   │   │   └── KeycloakService.cs
│   │   └── Seeders/
│   │       └── InitialDataSeeder.cs
│   │
│   └── BudgetTracker.Web/              # React Frontend
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   ├── Router.tsx
│       │   │   └── providers.tsx
│       │   ├── pages/
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── BudgetEntryPage.tsx
│       │   │   ├── BudgetVersionsPage.tsx
│       │   │   ├── ApprovalQueuePage.tsx
│       │   │   ├── VariancePage.tsx
│       │   │   ├── CustomerAnalysisPage.tsx
│       │   │   ├── ExpenseTrackingPage.tsx
│       │   │   ├── ScenarioPage.tsx
│       │   │   ├── ReportsPage.tsx
│       │   │   ├── ImportExportPage.tsx
│       │   │   ├── AlertsPage.tsx
│       │   │   ├── FxRatesPage.tsx
│       │   │   ├── AuditLogPage.tsx
│       │   │   ├── SettingsPage.tsx
│       │   │   └── LoginPage.tsx
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── dashboard/
│       │   │   │   ├── KpiCard.tsx
│       │   │   │   ├── RevenueChart.tsx
│       │   │   │   ├── LossRatioChart.tsx
│       │   │   │   ├── SegmentBreakdown.tsx
│       │   │   │   ├── ExpensePieChart.tsx
│       │   │   │   ├── MonthlyTrendTable.tsx
│       │   │   │   ├── TopCustomersTable.tsx
│       │   │   │   └── CombinedRatioGauge.tsx
│       │   │   ├── budget/
│       │   │   │   ├── BudgetGrid.tsx  # AG-Grid wrapper
│       │   │   │   ├── BudgetForm.tsx
│       │   │   │   ├── VersionDiffView.tsx
│       │   │   │   └── ApprovalActions.tsx
│       │   │   ├── variance/
│       │   │   ├── scenario/
│       │   │   ├── reports/
│       │   │   └── shared/
│       │   │       ├── MoneyDisplay.tsx     # Currency-aware
│       │   │       ├── CurrencySelector.tsx
│       │   │       └── ...
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── types/
│       │   ├── utils/
│       │   │   ├── formatters.ts
│       │   │   ├── calculations.ts     # Frontend-side read-only formüller
│       │   │   └── validators.ts
│       │   └── constants/
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       └── Dockerfile
│
├── tests/
│   ├── BudgetTracker.UnitTests/
│   │   ├── Calculations/               # Regression fixtures burada
│   │   │   ├── fixtures/
│   │   │   │   ├── golden_scenario_baseline.json
│   │   │   │   ├── golden_scenario_stressed.json
│   │   │   │   └── golden_historical_2025.json
│   │   │   ├── KpiCalculatorTests.cs
│   │   │   ├── VarianceCalculatorTests.cs
│   │   │   └── ScenarioCalculatorTests.cs
│   │   ├── Services/
│   │   └── Validators/
│   ├── BudgetTracker.IntegrationTests/
│   │   ├── Fixtures/
│   │   │   └── PostgresContainerFixture.cs  # Testcontainers
│   │   ├── Controllers/
│   │   └── Parsers/                    # Gerçek Excel dosyalarıyla test
│   │       └── fixtures/*.xlsx
│   └── BudgetTracker.E2E/
│       ├── playwright.config.ts
│       └── specs/
│           ├── login.spec.ts
│           ├── budgetEntry.spec.ts
│           ├── approval.spec.ts
│           ├── dashboard.spec.ts
│           └── export.spec.ts
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── CHANGELOG.md
└── README.md
```

### 2.5 Katmanlı Mimari Akışı

```
┌────────────────────────────────────────────────────────┐
│  React SPA (Tailwind + Zustand + TanStack Query)      │
│  - Pages → Components → Hooks → Services → Types       │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTPS / REST (+ Bearer JWT)
┌──────────────────────▼─────────────────────────────────┐
│  Keycloak (Auth, SSO, MFA)                            │
└──────────────────────┬─────────────────────────────────┘
                       │ OIDC token validation
┌──────────────────────▼─────────────────────────────────┐
│  .NET 10 Web API                                       │
│  Middleware: correlation → tenant → auth → audit       │
│  Controller → Service → Repository → EF Core           │
│  Background jobs: Hangfire (alerts, sync, reports)     │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│  PostgreSQL 16                                         │
│  - Tenant isolation (global query filter + RLS)        │
│  - pgaudit extension                                    │
│  - JSONB snapshots, scenarios, alert rules             │
│  - Partitioned audit_logs (monthly)                    │
└────────────────────────────────────────────────────────┘
```

---

## BÖLÜM 3: VERİ MODELİ VE ŞEMA

### 3.1 Tasarım Kuralları

1. **Multi-tenant:** Her işlem tablosu `company_id` içerir. EF Core global query filter ile otomatik filtrelenir. PostgreSQL RLS ek katman olarak kullanılır.
2. **Para birimi farkındalığı:** Tutar tutan her kolon yanında `currency_code` bulunur. Money value object olarak modele girer.
3. **Immutable versiyon:** `budget_entries` doğrudan düzenlenmez; bir `budget_version`'a bağlıdır. Onaylanan versiyon locked olur.
4. **Zaman bilinçli:** Tüm timestamp'ler `TIMESTAMPTZ` (UTC).
5. **Append-only audit:** `audit_logs` tablosuna yalnızca INSERT izni verilir (DB role seviyesinde).

### 3.2 Şema

```sql
-- ============================================================
-- TENANT / İDARİ
-- ============================================================

CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    tax_no          VARCHAR(20),
    default_currency CHAR(3) NOT NULL DEFAULT 'TRY',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    keycloak_id     VARCHAR(100) UNIQUE NOT NULL,  -- external IdP ID
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role            VARCHAR(30) NOT NULL,           -- Admin | CFO | FinanceManager | DepartmentHead | Viewer
    default_company_id INT REFERENCES companies(id),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Çok şirketli erişim (opsiyonel)
CREATE TABLE user_companies (
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    company_id      INT REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, company_id)
);

-- Department Head rolü için segment bazlı yetki
CREATE TABLE user_segments (
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    segment_id      INT NOT NULL,                   -- segments(id) FK below
    can_edit        BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, segment_id)
);

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE segments (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    code            VARCHAR(30) NOT NULL,           -- SIGORTA | OTOMOTIV | FILO | ALTERNATIF | SGK_TESVIK
    name            VARCHAR(100) NOT NULL,
    display_order   INT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    segment_id      INT NOT NULL REFERENCES segments(id),
    start_date      DATE,
    end_date        DATE,
    source_sheet    VARCHAR(100),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE TABLE expense_categories (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    parent_id       INT REFERENCES expense_categories(id),
    classification  VARCHAR(20) NOT NULL,           -- TECHNICAL | GENERAL | FINANCIAL | EXTRAORDINARY
    display_order   INT,
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (company_id, code)
);

-- ============================================================
-- FX / PARA BİRİMİ
-- ============================================================

CREATE TABLE currencies (
    code            CHAR(3) PRIMARY KEY,            -- TRY, USD, EUR, ...
    name            VARCHAR(50) NOT NULL,
    symbol          VARCHAR(5),
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE fx_rates (
    id              BIGSERIAL PRIMARY KEY,
    rate_date       DATE NOT NULL,
    from_currency   CHAR(3) REFERENCES currencies(code),
    to_currency     CHAR(3) REFERENCES currencies(code),
    rate            DECIMAL(18,8) NOT NULL,
    source          VARCHAR(30) NOT NULL,           -- TCMB | MANUAL | ECB
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (rate_date, from_currency, to_currency, source)
);

CREATE INDEX idx_fx_rates_lookup ON fx_rates(rate_date DESC, from_currency, to_currency);

-- ============================================================
-- BÜTÇE YILI VE VERSİYONLAMA
-- ============================================================

CREATE TABLE budget_years (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    year            INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, year)
);

CREATE TABLE budget_versions (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    revision_no     INT NOT NULL,
    name            VARCHAR(200) NOT NULL,          -- "Rev 7 - Şubat Revizyonu"
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                    -- DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | ACTIVE | ARCHIVED | REJECTED
    is_active       BOOLEAN DEFAULT FALSE,          -- Tek bir ACTIVE versiyon aktif
    parent_version_id INT REFERENCES budget_versions(id),
    created_by      INT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    locked_at       TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    UNIQUE (company_id, budget_year_id, revision_no)
);

CREATE INDEX idx_budget_versions_active ON budget_versions(company_id, budget_year_id)
    WHERE is_active = TRUE;

-- ============================================================
-- ONAY AKIŞI
-- ============================================================

CREATE TABLE budget_approvals (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    version_id      INT NOT NULL REFERENCES budget_versions(id),
    stage           VARCHAR(30) NOT NULL,           -- DEPT_HEAD | FINANCE | CFO
    stage_order     INT NOT NULL,
    approver_id     INT REFERENCES users(id),
    decision        VARCHAR(20),                    -- PENDING | APPROVED | REJECTED
    comment         TEXT,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_version ON budget_approvals(version_id, stage_order);

-- ============================================================
-- BÜTÇE VERİSİ
-- ============================================================

CREATE TABLE budget_entries (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    version_id      INT NOT NULL REFERENCES budget_versions(id),
    customer_id     INT NOT NULL REFERENCES customers(id),
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    entry_type      VARCHAR(10) NOT NULL,           -- REVENUE | CLAIM
    -- Karar #2: çift raporlama (orijinal + yıl başı sabit + ay sonu spot)
    amount_original  DECIMAL(18,2) NOT NULL DEFAULT 0,  -- girilen orijinal tutar
    currency_code    CHAR(3) NOT NULL REFERENCES currencies(code),
    amount_try_fixed DECIMAL(18,2) NOT NULL DEFAULT 0,  -- yıl başı kuruyla TRY
    amount_try_spot  DECIMAL(18,2) NOT NULL DEFAULT 0,  -- ay sonu kuruyla TRY
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    updated_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (version_id, customer_id, month, entry_type)
);

CREATE INDEX idx_budget_entries_lookup
    ON budget_entries(company_id, version_id, customer_id, month);

CREATE TABLE actual_entries (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    customer_id     INT NOT NULL REFERENCES customers(id),
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    entry_type      VARCHAR(10) NOT NULL,
    amount_original  DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency_code    CHAR(3) NOT NULL REFERENCES currencies(code),
    amount_try_fixed DECIMAL(18,2) NOT NULL DEFAULT 0,
    amount_try_spot  DECIMAL(18,2) NOT NULL DEFAULT 0,
    source          VARCHAR(30) NOT NULL,           -- MANUAL | ERP_SYNC | IMPORT
    synced_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, budget_year_id, customer_id, month, entry_type)
);

CREATE INDEX idx_actual_entries_lookup
    ON actual_entries(company_id, budget_year_id, customer_id, month);

CREATE TABLE expense_entries (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    version_id      INT REFERENCES budget_versions(id),  -- NULL = ACTUAL
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    category_id     INT NOT NULL REFERENCES expense_categories(id),
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    entry_type      VARCHAR(10) NOT NULL,           -- BUDGET | ACTUAL
    amount_original  DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency_code    CHAR(3) NOT NULL REFERENCES currencies(code),
    amount_try_fixed DECIMAL(18,2) NOT NULL DEFAULT 0,
    amount_try_spot  DECIMAL(18,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_entries_lookup
    ON expense_entries(company_id, budget_year_id, category_id, month);

CREATE TABLE special_items (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    version_id      INT REFERENCES budget_versions(id),
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    item_type       VARCHAR(30) NOT NULL,
                    -- MUALLAK_HASAR | DEMO_FILO | FINANSAL_GELIR | T_KATILIM | AMORTISMAN
    month           INT CHECK (month BETWEEN 1 AND 12),  -- NULL = yıllık
    amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency_code   CHAR(3) NOT NULL REFERENCES currencies(code),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SENARYO / ALERT
-- ============================================================

CREATE TABLE scenarios (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    base_version_id INT NOT NULL REFERENCES budget_versions(id),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    parameters      JSONB NOT NULL,
    results         JSONB,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_rules (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    name            VARCHAR(200) NOT NULL,
    rule_type       VARCHAR(30) NOT NULL,
                    -- BUDGET_OVERRUN | LR_THRESHOLD | ANOMALY | TREND_DEVIATION | STATEFUL_STREAK
    condition       JSONB NOT NULL,
    severity        VARCHAR(10) NOT NULL,           -- LOW | MEDIUM | HIGH | CRITICAL
    is_active       BOOLEAN DEFAULT TRUE,
    notify_roles    TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_instances (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    rule_id         INT NOT NULL REFERENCES alert_rules(id),
    triggered_at    TIMESTAMPTZ DEFAULT NOW(),
    context         JSONB NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    resolved_by     INT REFERENCES users(id)
);

CREATE INDEX idx_alert_instances_unread
    ON alert_instances(company_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- FORECAST (Karar #7 — P2'de doldurulacak, MVP'de stub)
-- ============================================================

CREATE TABLE forecast_entries (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INT NOT NULL REFERENCES companies(id),
    budget_year_id  INT NOT NULL REFERENCES budget_years(id),
    customer_id     INT REFERENCES customers(id),     -- NULL = aggregate
    category_id     INT REFERENCES expense_categories(id),  -- NULL = revenue/claim
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    entry_type      VARCHAR(10) NOT NULL,             -- REVENUE | CLAIM | EXPENSE
    forecast_amount DECIMAL(18,2) NOT NULL,
    confidence_low  DECIMAL(18,2),                    -- alt güven aralığı
    confidence_high DECIMAL(18,2),                    -- üst güven aralığı
    model_name      VARCHAR(50) NOT NULL,             -- ML.NET SSA | ARIMA | manual
    model_version   VARCHAR(20),
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, budget_year_id, customer_id, category_id, month, entry_type)
);

CREATE INDEX idx_forecast_lookup ON forecast_entries(company_id, budget_year_id, month);

-- ============================================================
-- AUDIT LOG (Append-only, partitioned)
-- ============================================================

CREATE TABLE audit_logs (
    id              BIGSERIAL,
    company_id      INT NOT NULL,
    user_id         INT REFERENCES users(id),
    session_id      VARCHAR(100),
    correlation_id  VARCHAR(100),
    action          VARCHAR(50) NOT NULL,
                    -- CREATE | UPDATE | DELETE | APPROVE | REJECT | LOGIN | LOGOUT | EXPORT | IMPORT
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       BIGINT,
    old_values      JSONB,
    new_values      JSONB,
    reason          TEXT,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(company_id, user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(company_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);

-- Retention: 7 yıl (mali mevzuat gereği). Aylık partition + 84 aydan eski partition drop.
-- DB role seviyesinde: uygulama kullanıcısına yalnızca INSERT izni verilir.

-- ============================================================
-- GLOBAL CONSTRAINTS
-- ============================================================

-- Tek aktif versiyon garantisi:
ALTER TABLE budget_versions
    ADD CONSTRAINT single_active_version
    EXCLUDE (company_id WITH =, budget_year_id WITH =)
    WHERE (is_active = TRUE);

-- PostgreSQL Row-Level Security (multi-tenant defense-in-depth)
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;
-- ... tüm işlem tabloları için

CREATE POLICY tenant_isolation ON budget_entries
    USING (company_id = current_setting('app.current_company_id')::INT);

-- ============================================================
-- SEED DATA (Migration script — Tur Assist Group)
-- ============================================================

-- 5 segment (Manus referansından, Karar #6 — kullanıcı onayı 2026-04-15)
INSERT INTO segments (company_id, code, name, display_order) VALUES
    (1, 'SIGORTA',    'Sigorta Şirketleri',   1),
    (1, 'OTOMOTIV',   'Otomotiv Şirketleri',  2),
    (1, 'FILO',       'Filo Şirketleri',      3),
    (1, 'ALTERNATIF', 'Alternatif Kanallar',  4),
    (1, 'SGK_TESVIK', 'SGK Teşvik',           5);

-- 9 gider kategorisi + sınıflandırma (Karar #3)
INSERT INTO expense_categories (company_id, code, name, classification, display_order) VALUES
    (1, 'PERSONEL',       'Personel Giderleri',       'GENERAL',   1),
    (1, 'SIRKET_GENEL',   'Şirket Genel Giderleri',   'GENERAL',   2),
    (1, 'IT',             'IT Giderleri',             'GENERAL',   3),
    (1, 'ARAC',           'Araç Giderleri',           'GENERAL',   4),
    (1, 'FINANSMAN',      'Finansman Giderleri',      'FINANCIAL', 5),
    (1, 'HOLDING',        'Holding Giderleri',        'GENERAL',   6),
    (1, 'DIGER',          'Diğer Giderler',           'GENERAL',   7),
    -- P&L ek kalemleri (formül zincirinde Teknik Kar sonrası)
    (1, 'FINANSAL_GELIR', 'Finansal Gelir',           'FINANCIAL', 8),
    (1, 'AMORTISMAN',     'Amortisman',               'TECHNICAL', 9);

INSERT INTO currencies (code, name, symbol) VALUES
    ('TRY', 'Türk Lirası', '₺'),
    ('USD', 'Amerikan Doları', '$'),
    ('EUR', 'Euro', '€');
```

### 3.3 Şema Özeti (Kritik Tablolar)

| Tablo | Amaç | Kritik Alanlar |
|---|---|---|
| `companies` | Multi-tenant ana anahtarı | `default_currency` |
| `budget_versions` | Revizyon/snapshot modeli | `revision_no`, `status`, `parent_version_id`, `is_active` |
| `budget_approvals` | Çok aşamalı onay kaydı | `stage`, `decision`, `comment`, `decided_at` |
| `budget_entries` | Müşteri × ay × tip bütçe hücresi | `version_id` (→ versiyona bağlı, versiyonsuz yazılamaz) |
| `actual_entries` | Gerçekleşme verileri | `source` (MANUAL/ERP/IMPORT) |
| `fx_rates` | TCMB kurları | Günlük granularity, birden fazla kaynak desteği |
| `audit_logs` | Denetim izi | `session_id`, `correlation_id`, `reason`, partition by month |
| `user_segments` | Department head segment yetkisi | `can_edit` |

---

## BÖLÜM 4: FONKSİYONEL GEREKSİNİMLER

### 4.1 Rol ve Yetki Matrisi

| Rol | Dashboard | Bütçe Giriş | Onay | Gerçekleşme | Senaryo | Rapor | FX | Admin |
|---|---|---|---|---|---|---|---|---|
| **Admin** | Tam | Tam | Tam | Tam | Tam | Tam | Tam | Tam |
| **CFO** | Tam | Okuma | Final Onay | Okuma | Tam | Tam | Okuma | - |
| **FinanceManager** | Tam | Tam | Finans Onay | Tam | Tam | Tam | Tam | Okuma |
| **DepartmentHead** | Kendi segmenti | Kendi segmenti (yetkiliyse) | Dept Onay | Okuma | Okuma | Kendi segmenti | - | - |
| **Viewer** | Okuma | - | - | - | - | Okuma | - | - |

### 4.2 Kullanıcı Hikayeleri (FR Tablosu)

| ID | Modül | Kullanıcı Hikayesi | Kabul Kriteri | Öncelik |
|---|---|---|---|---|
| FR-001 | Bütçe Giriş | Finans yöneticisi olarak müşteri bazlı aylık gelir/hasar bütçesi girebilmeliyim | 89+ müşteri × 12 ay × (gelir/hasar) grid, inline editing, otomatik toplam | P0 |
| FR-002 | Import | Excel dosyasından bütçe verisi import edebilmeliyim | Mevcut Excel formatları otomatik tanınır, hatalı satırlar raporlanır | P0 |
| FR-003 | Versiyonlama | Finans olarak bütçe revizyonları oluşturup karşılaştırabilmeliyim | Aynı yıl için çoklu revizyon, diff görüntüleme, onaylanan immutable | P0 |
| FR-004 | Onay | Dept Head olarak bütçemi submit edebilmeliyim, Finans ve CFO aşamalı onay verebilmeli | State machine: DRAFT → SUBMITTED → DEPT → FINANCE → CFO → ACTIVE, ret gerekçeli | P0 |
| FR-005 | Dashboard | CEO olarak tek ekranda tüm KPI'ları görebilmeliyim | Gelir, hasar, marj, LR, CR, EBITDA kartları + 8 grafik | P0 |
| FR-006 | Dashboard | Aylık trend grafiklerini görebilmeliyim | 12 ay × (gelir, hasar, marj, LR, CR) çizgi grafikleri, filtrelenebilir | P0 |
| FR-007 | Segment | 4 segment bazlı performans karşılaştırması yapabilmeliyim | Sigorta/Otomotiv/Filo/Alternatif P&L, drill-down | P1 |
| FR-008 | Variance | Bütçe vs gerçekleşme sapma analizi görebilmeliyim | Aylık sapma %/₺, heatmap, waterfall | P0 |
| FR-009 | Müşteri | Müşteri bazlı kârlılık analizi yapabilmeliyim | Top/bottom müşteri sıralaması, LR, konsantrasyon, Lorenz, HHI | P1 |
| FR-010 | Gider | Gider kalemlerini hiyerarşik olarak takip edebilmeliyim | Personel, IT, araç vb. detaylı kırılım, bütçe limiti uyarısı | P0 |
| FR-011 | FX | Bütçeyi farklı para birimlerinde görüntüleyebilmeliyim | TL/USD/EUR seçimi, TCMB kurları, dönem sonu revalüasyon | P0 |
| FR-012 | Senaryo | What-if analizi yapabilmeliyim | Gelir/hasar/gider parametreleri, Tornado, break-even, 5 senaryo kaydı | P1 |
| FR-013 | Alert | Bütçe aşımı/anomali bildirimlerini alabilmeliyim | Email + in-app, kural bazlı, severity, stateful streak desteği | P1 |
| FR-014 | AI Tahmin | AI bazlı gelir/hasar tahmini görebilmeliyim | MAPE <%10, güven aralığı, mevsimsellik | P2 |
| FR-015 | Export | Yönetim kurulu raporunu otomatik üretebilmeliyim | PDF + Excel, şablon bazlı, zamanlı | P1 |
| FR-016 | Entegrasyon | ERP sisteminden gerçekleşme verisi otomatik gelsin | API / dosya bazlı sync, conflict resolution | P1 |
| FR-017 | Konsolidasyon | Grup bazlı konsolide bütçe görebilmeliyim | Çoklu şirket toplamı, eliminasyon | P2 |
| FR-018 | Audit | Admin olarak herhangi bir satırın değişiklik geçmişini görebilmeliyim | Kim, ne zaman, eski/yeni değer, gerekçe, IP, session | P0 |
| FR-019 | KVKK | Kişisel veri silme/anonimleştirme talebini işleyebilmeliyim | Soft delete + anonimleştirme, 72 saat içinde uygulama | P0 |
| FR-020 | Güvenlik | KVKK uyumlu veri yönetimi (şifreleme, rate limit, MFA) | TLS 1.3, Argon2id, Keycloak MFA, pgaudit | P0 |
| FR-021 | Hesaplama Testi | Tüm finansal formüller regression fixtures üzerinde doğrulansın | Altın dosya suite, CI'da zorunlu, %95 coverage | P0 |
| FR-022 | Multi-tenant | Sistem Day 1'den çoklu şirket desteklesin | company_id tüm tablolarda, EF global filter, RLS | P0 |

### 4.3 Modül Detayları

#### MODÜL 1: Bütçe Giriş ve Versiyon Yönetimi

**Ekranlar:**
- Bütçe Yılı Seçimi ve Versiyon Listesi
  - Aktif versiyon vurgulanır
  - Revizyon geçmişi (Rev 1, Rev 2, ..., Rev 7) listelenir
  - Durum badge'i (DRAFT / SUBMITTED / APPROVED / ACTIVE / ARCHIVED / REJECTED)
- Versiyon Diff Ekranı (iki revizyon yan yana)
  - Değişen satırlar vurgulanır
  - Sütun: müşteri / ay / eski tutar / yeni tutar / fark / fark %
- Müşteri Bazlı Bütçe Grid (AG-Grid ile spreadsheet UI)
  - Satırlar: müşteriler (segment bazlı gruplu, expand/collapse)
  - Sütunlar: Ocak → Aralık + Yıl Toplamı
  - Inline editing (çift tıkla → düzenle)
  - Toplu güncelleme (seçili hücrelere %X uygula / sabit ekle)
  - Undo/redo
  - Dirty state vurgulama
  - Otomatik toplam hesaplama
  - Gelir ve Hasar sekmeler ya da tip seçici
- Gider Bütçe Grid (benzer yapı, hiyerarşik kategori)
- Özel Kalemler Girişi (muallak hasar, demo filo, finansal gelir, T.katılım, amortisman)
- Excel Import/Export
  - Format otomatik tespit (parser registry)
  - Doğrulama raporu
  - Template download

**İşlemler:**
- Yeni revizyon oluştur (mevcut versiyondan kopya veya boş)
- Revizyonu submit et → Onay akışı başlar
- Revizyonu aktif yap (CFO onayından sonra otomatik)
- Eski revizyonu arşivle
- İki revizyonu diff ile karşılaştır

#### MODÜL 2: Onay Akışı

**State Machine:**

```
DRAFT → SUBMITTED → DEPT_APPROVED → FINANCE_APPROVED → CFO_APPROVED → ACTIVE
   ↑        │             │                  │                │
   │        ▼             ▼                  ▼                ▼
   └────── REJECTED    REJECTED           REJECTED         REJECTED
```

**Davranışlar:**
- Reddedilen versiyon DRAFT'a döner
- Yeni revizyon açılması zorunlu (reddedilen versiyon değiştirilemez)
- Her karar: gerekçe zorunlu
- Her karar: audit log + email bildirim
- Sadece bir ACTIVE versiyon olabilir (DB constraint)
- CFO onayından sonra bir önceki ACTIVE versiyon otomatik ARCHIVED

**Onay Kuyruğu Ekranı:**
- Bekleyen onaylar rol bazlı listelenir
- Filtreleme: kendi rolüne denk olanlar
- Hızlı aksiyon: onay / ret (gerekçe zorunlu) / versiyon diff görüntüleme

#### MODÜL 3: Yönetici Dashboard

**KPI Kartları (üst bant):**
- Yıllık Gelir (₺) — trend ok (YoY karşılaştırma)
- Yıllık Hasar (₺)
- Teknik Marj (₺)
- Net Kar (₺)
- EBITDA (₺)
- Loss Ratio (%) — gauge chart
- Gider Rasyosu (%)
- Combined Ratio (%) — yeşil <%100, kırmızı >%100

**Grafikler:**
- Aylık Gelir-Hasar Trend (dual axis line)
- Loss Ratio Trend (line + threshold line @%60)
- EBITDA Aylık Bar
- Segment Gelir Dağılımı (donut)
- Gider Kırılımı (pie)
- Kümülatif Gelir vs. Bütçe Hedef (area)
- Combined Ratio Trend (line + %100 threshold)
- Top 10 Müşteri Gelir (horizontal bar)

**Tablolar:**
- Aylık Özet Tablo (12 ay × KPI metrikleri)
- Segment Bazlı Performans Tablosu
- Bütçe Gerçekleşme Oranları
- Son Alertler

**Filtreler:**
- Yıl / Versiyon seçimi
- Ay aralığı (Q1, H1, Full Year, custom)
- Segment (çoklu seçim)
- Müşteri arama
- **Para birimi (TL / USD / EUR)**

**Cache stratejisi:**
- Dashboard verileri event-driven invalidation ile TanStack Query cache'inde tutulur.
- Write işlemlerinde ilgili key'ler invalidate edilir.

#### MODÜL 4: Bütçe vs. Gerçekleşme (Variance Analysis)

**Ekranlar:**
- Sapma Heatmap (müşteri × ay veya gider × ay, renk: yeşil/kırmızı)
- Sapma Detay Tablosu (sort/filter, drill-down)
- Waterfall Chart (bütçe → gerçekleşme geçişi)
- YTD Gerçekleşme Progress Bar

**Alert Kuralları (örnek):**
- Aylık gelir bütçeden -%10 sapma → MEDIUM
- Aylık hasar bütçeden +%15 sapma → HIGH
- Müşteri bazlı LR > %80 → HIGH
- Gider kalemi bütçe aşımı > %20 → CRITICAL
- 3 ay üst üste negatif EBITDA → CRITICAL (stateful streak rule)

#### MODÜL 5: Müşteri ve Segment Analizi

- Müşteri Kârlılık Sıralaması (sparkline 12 ay mini grafik)
- Segment Karşılaştırma (4 segment yan yana, radar chart)
- Müşteri Detay Sayfası (tam geçmiş, notlar, trend)
- Konsantrasyon Analizi (Top 5/10/20 pay, Lorenz eğrisi, HHI)
- Yeni Müşteri Etki Analizi (yıl içi başlayan müşterilerin etkisi)

#### MODÜL 6: Senaryo Motoru

**Parametre Seti:**
- Gelir Değişimi (genel, segment, müşteri bazlı)
- Hasar / LR Değişimi
- Gider Değişimi (genel veya kalem bazlı)
- Özel: yeni müşteri ekleme, müşteri kaybı, mevsimsel düzeltme

**Çıktı:**
- Senaryo P&L Tablosu (baz vs. senaryo)
- KPI etki analizi (△Gelir, △EBITDA, △Kar, △LR, △CR)
- Duyarlılık Tablosu (Tornado chart)
- Break-even Analizi
- Senaryo kaydetme ve karşılaştırma (max 5)

#### MODÜL 7: AI Tahmin ve Erken Uyarı (P2)

**Tahmin Modelleri (ayrı Python servisi, ileri sürümde):**
- Gelir Tahmini (Prophet veya ARIMA, mevsimsel)
- Hasar Tahmini (XGBoost / LightGBM)
- Anomali Tespiti (Isolation Forest veya Z-score)

**Erken Uyarı Widget:**
- Aktif alert sayısı (severity bazlı)
- Son 7 gün alert listesi
- Trend sapma göstergesi
- Önerilen aksiyon listesi

#### MODÜL 8: Raporlama ve Export

**Otomatik Raporlar:**
- Yönetim Kurulu Raporu (PDF, QuestPDF şablon)
- Aylık Finans Raporu (Excel, ClosedXML)
- Segment Raporu
- Müşteri Kârlılık Raporu
- Variance Raporu
- Audit Raporu

**Zamanlama:**
- Aylık: her ayın 5'inde otomatik üretim + email
- Haftalık özet: Pazartesi email digest
- Anlık: dashboard'dan tek tıkla

#### MODÜL 9: FX Yönetimi

- TCMB günlük kur çekme (Hangfire scheduled job)
- Manuel kur ekleme/düzeltme (yetkili kullanıcı)
- Kur geçmişi görüntüleme
- Dönem sonu revalüasyon raporu

#### MODÜL 10: Entegrasyon (P1)

- ERP API connector (configurable)
- Veri mapping ve dönüşüm
- Scheduled sync (background job)
- Conflict resolution (manuel / otomatik kurallar)

#### MODÜL 11: Çoklu Şirket ve Konsolidasyon (P2)

- Şirket seçici
- Grup bazlı konsolide bütçe
- Inter-company eliminasyon
- Grup raporu

#### MODÜL 12: Audit ve KVKK

- Audit Log Viewer (filtre: kullanıcı, entity, tarih, aksiyon)
- Kişisel Veri Silme/Anonimleştirme Panelleri
- VERBİS kayıt notu alanı
- Veri saklama politikası konfigürasyonu

---

## BÖLÜM 5: FİNANSAL HESAPLAMA MOTORU

### 5.1 KPI Formülleri

Tüm hesaplamalar `BudgetTracker.Application/Calculations/` altında toplanır. Her formül için regression fixture test suite zorunludur (bkz. §8.3).

```
Segment Gelir       = SUM(budget_entries.amount
                          WHERE entry_type = 'REVENUE'
                            AND customer.segment = X)

Segment Hasar       = SUM(budget_entries.amount
                          WHERE entry_type = 'CLAIM'
                            AND customer.segment = X)

Teknik Marj         = Toplam Gelir − Toplam Hasar

Loss Ratio          = Toplam Hasar / Toplam Gelir

Genel Giderler      = SUM(expense_entries WHERE classification = 'GENERAL')

Teknik Giderler     = SUM(expense_entries WHERE classification = 'TECHNICAL')

Teknik Kar          = Teknik Marj − Teknik Giderler − Genel Giderler

Finansal Gelir      = SUM(special_items WHERE item_type = 'FINANSAL_GELIR')

Finansman Gideri    = SUM(expense_entries WHERE classification = 'FINANCIAL')

T.Katılım           = SUM(special_items WHERE item_type = 'T_KATILIM')

Amortisman          = SUM(special_items WHERE item_type = 'AMORTISMAN')

Net Kar             = Teknik Kar
                      + Finansal Gelir
                      − Finansman Gideri
                      + T.Katılım
                      + Diğer Olağan Dışı K/Z

EBITDA              = Net Kar + Amortisman + Finansman Gideri

Gider Rasyosu       = Toplam Gider / Toplam Gelir

Combined Ratio      = Loss Ratio + Gider Rasyosu

EBITDA Marjı        = EBITDA / Toplam Gelir

Teknik Kar Rasyosu  = Teknik Kar / Toplam Gelir

Kar Rasyosu         = Net Kar / Toplam Gelir

Müşteri Konsantrasyon (Top N)
                    = SUM(Top N müşteri gelir) / Toplam Gelir

HHI (Herfindahl)    = SUM((müşteri gelir payı)^2)

Muallak Oranı       = SUM(special_items MUALLAK_HASAR) / Toplam Hasar
```

### 5.2 Para Birimi Dönüşümü

Raporlama para birimi seçildiğinde her tutar dönüştürülür:

```
converted_amount = amount × fx_rate(rate_date, from_currency, to_currency)
```

- Bütçe verileri için `rate_date = budget_year.year-01-01` (yıl başı kuru) — kararlaştırılabilir
- Actual için `rate_date = entry ait olduğu ayın son iş günü`
- Revalüasyon raporu bu iki değerin farkını gösterir

### 5.3 Hesaplama Hassasiyeti

- Backend: `decimal` (18,2) — para, `decimal` (18,8) — kurlar
- Frontend: `Intl.NumberFormat('tr-TR', { style: 'currency' })`
- Yuvarlama kuralı: Banker's rounding (MidpointRounding.ToEven)
- Oranlar 4 ondalık yer tutulur, UI'da 2 ondalık gösterilir

---

## BÖLÜM 6: API ENDPOINT REFERANSI

Tüm endpoint'ler `/api/v1/` prefix'i altındadır. JWT bearer token zorunludur (AllowAnonymous işaretli olanlar hariç).

### 6.1 Auth

```
POST   /api/v1/auth/callback               → Keycloak OIDC callback
POST   /api/v1/auth/refresh                → Token yenileme
POST   /api/v1/auth/logout                 → Session sonlandır
GET    /api/v1/auth/me                     → Mevcut kullanıcı bilgisi + şirket/rol
```

### 6.2 Şirket / Tenant

```
GET    /api/v1/companies                   → Kullanıcının erişebildiği şirketler
POST   /api/v1/companies/{id}/switch       → Aktif şirketi değiştir
```

### 6.3 Bütçe ve Versiyonlama

```
GET    /api/v1/budget/years                → Bütçe yılları
POST   /api/v1/budget/years                → Yeni yıl oluştur

GET    /api/v1/budget/years/{yearId}/versions         → Versiyon listesi
POST   /api/v1/budget/years/{yearId}/versions         → Yeni revizyon (boş veya kopya)
GET    /api/v1/budget/versions/{versionId}            → Versiyon detayı
GET    /api/v1/budget/versions/{versionId}/diff/{otherVersionId}  → İki versiyon karşılaştırma
POST   /api/v1/budget/versions/{versionId}/archive    → Arşivle

GET    /api/v1/budget/versions/{versionId}/entries    → Bütçe kalemleri
POST   /api/v1/budget/versions/{versionId}/entries    → Tekli kalem
PUT    /api/v1/budget/versions/{versionId}/entries/bulk  → Toplu güncelleme
DELETE /api/v1/budget/versions/{versionId}/entries/{id}  → Kalem silme
```

### 6.4 Onay Akışı

```
POST   /api/v1/budget/versions/{versionId}/submit     → Onaya gönder (DRAFT → SUBMITTED)
GET    /api/v1/approvals/queue                        → Rolüme düşen bekleyen onaylar
POST   /api/v1/approvals/{approvalId}/approve         → Onayla (gerekçe opsiyonel)
POST   /api/v1/approvals/{approvalId}/reject          → Reddet (gerekçe zorunlu)
GET    /api/v1/budget/versions/{versionId}/approvals  → Versiyonun onay geçmişi
```

### 6.5 Gerçekleşme

```
GET    /api/v1/actual/{yearId}/entries                → Gerçekleşme verileri
POST   /api/v1/actual/{yearId}/entries                → Manuel giriş
POST   /api/v1/actual/{yearId}/sync                   → ERP sync tetikle
```

### 6.6 Dashboard

```
GET    /api/v1/dashboard/{versionId}/kpis             → KPI kartları
GET    /api/v1/dashboard/{versionId}/trends           → Aylık trendler
GET    /api/v1/dashboard/{versionId}/segments         → Segment performans
GET    /api/v1/dashboard/{versionId}/expenses         → Gider kırılımı
GET    /api/v1/dashboard/{versionId}/top-customers    → Top müşteriler
```

Query parametre: `?currency=TRY|USD|EUR`

### 6.7 Variance

```
GET    /api/v1/variance/{versionId}/heatmap           → Sapma heatmap
GET    /api/v1/variance/{versionId}/details           → Sapma detay tablosu
GET    /api/v1/variance/{versionId}/waterfall         → Waterfall verisi
```

### 6.8 Customer / Segment

```
GET    /api/v1/customers                              → Müşteri listesi
POST   /api/v1/customers                              → Yeni müşteri
GET    /api/v1/customers/{id}                         → Müşteri detayı
GET    /api/v1/customers/{id}/profitability           → Kârlılık analizi
GET    /api/v1/customers/concentration                → Konsantrasyon (HHI, Lorenz)

GET    /api/v1/segments                               → Segment listesi
GET    /api/v1/segments/{id}/performance              → Segment P&L
```

### 6.9 Expense

```
GET    /api/v1/expenses/categories                    → Kategori listesi
GET    /api/v1/expenses/{yearId}/entries              → Gider kalemleri
POST   /api/v1/expenses/{yearId}/entries              → Gider girişi
GET    /api/v1/expenses/{yearId}/analysis             → Gider analizi
```

### 6.10 Senaryo

```
GET    /api/v1/scenarios/{yearId}                     → Kayıtlı senaryolar
POST   /api/v1/scenarios/{yearId}                     → Yeni senaryo
POST   /api/v1/scenarios/{yearId}/calculate           → Kaydetmeden hesapla
GET    /api/v1/scenarios/{id}/compare                 → Baz vs. senaryo
GET    /api/v1/scenarios/{yearId}/sensitivity         → Duyarlılık (Tornado)
```

### 6.11 Alert

```
GET    /api/v1/alerts/rules                           → Kurallar
POST   /api/v1/alerts/rules                           → Yeni kural
PUT    /api/v1/alerts/rules/{id}                      → Güncelleme
GET    /api/v1/alerts/instances                       → Tetiklenenler
PUT    /api/v1/alerts/instances/{id}/resolve          → Çöz
```

### 6.12 FX

```
GET    /api/v1/fx/rates?date=YYYY-MM-DD               → Kur sorgu
POST   /api/v1/fx/rates/sync                          → TCMB sync (manuel tetikleme)
POST   /api/v1/fx/rates/manual                        → Manuel kur girişi (yetkili)
```

### 6.13 Report / Export

```
POST   /api/v1/reports/{versionId}/board-report       → YK raporu üret (PDF)
POST   /api/v1/reports/{versionId}/monthly            → Aylık rapor (Excel)
POST   /api/v1/reports/{versionId}/variance           → Variance raporu
GET    /api/v1/reports/download/{reportId}            → Rapor indirme
```

### 6.14 Import / Export

```
POST   /api/v1/import/excel                           → Excel import (multipart)
GET    /api/v1/export/{versionId}/excel               → Full Excel export
GET    /api/v1/export/{versionId}/template            → Boş şablon
```

### 6.15 Admin

```
GET    /api/v1/admin/users                            → Kullanıcı listesi
POST   /api/v1/admin/users                            → Kullanıcı oluştur (Keycloak ile senkron)
PUT    /api/v1/admin/users/{id}                       → Güncelle
GET    /api/v1/admin/audit-logs                       → Audit logs (filtre, pagination)
GET    /api/v1/admin/audit-logs/export                → Audit log export (CSV)
POST   /api/v1/admin/gdpr/delete-request              → KVKK silme talebi
```

---

## BÖLÜM 7: GÜVENLİK VE KVKK

### 7.1 Veri Sınıflandırma

| Kategori | İçerik | Gizlilik |
|---|---|---|
| Kişisel Veri | Email, isim, IP adresi, session bilgisi | Kısıtlı |
| Hassas İş Verisi | Bütçe, gelir, hasar, kârlılık, müşteri kimliği | Gizli (Confidential) |
| Sistem Verisi | Log, metrik, konfigürasyon | Kurumsal İç |

**İlke:** Kişisel veri minimize edilir. Sistem, müşterilerin TC kimlik, telefon, adres gibi bilgilerini saklamaz; sadece kullanıcı hesabı için email ve isim tutulur.

### 7.2 KVKK Uyumu

| Gereksinim | Uygulama |
|---|---|
| DPIA (Veri Koruma Etki Değerlendirmesi) | Proje başında, hukuk birimi ile |
| VERBİS kaydı | Go-live öncesi |
| Veri işleme envanteri | Her modül için kayıt |
| Açık rıza mekanizması | İlk login'de kullanıcı onay akışı |
| Veri saklama süresi | Aktif kullanıcı + 3 yıl (konfigüre edilebilir) |
| Silme hakkı | Soft delete + anonimleştirme (FR-019) |
| Veri ihlali bildirimi | 72 saat içinde bildirim mekanizması |
| Erişim logları | pgaudit + uygulama katmanı audit_logs |
| Şifreleme (at-rest) | TDE veya PostgreSQL `pgcrypto` hassas kolonlar için |
| Şifreleme (in-transit) | TLS 1.3 zorunlu |
| Veri lokasyonu | Türkiye (Azure Turkey Region veya on-prem) |
| Retention + otomatik temizlik | Aylık Hangfire job |

### 7.3 Teknik Güvenlik Kontrolleri

```
Authentication:
├── Keycloak SSO + OIDC
├── MFA (TOTP veya WebAuthn)
├── Password policy: Min 12 char, büyük+küçük+sayı+özel
├── Account lockout: 5 başarısız deneme → 15dk kilit
├── Session timeout: 30dk idle, 8 saat absolute
└── Token: Access 15dk, Refresh 7 gün, rotating refresh

Authorization:
├── Role-based (Admin, CFO, FinanceManager, DepartmentHead, Viewer)
├── Segment-based (DepartmentHead → user_segments)
├── Tenant isolation (company_id global filter + RLS)
└── Endpoint default [Authorize]

Input & Output:
├── FluentValidation tüm request DTO'lar
├── Parameterized queries (EF Core)
├── CSP + sanitization (frontend)
├── Anti-forgery token (CSRF)
└── File upload: mime + magic byte doğrulama, max 50MB

Network:
├── CORS whitelist
├── Rate limiting (100 req/dk/kullanıcı, 20 req/dk/anonymous)
├── TLS 1.3 zorunlu
├── HSTS header
└── Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

Secrets:
├── Azure Key Vault veya HashiCorp Vault
├── Dependabot + Snyk scanning
├── Secret rotation: 90 gün
└── .env dosyaları gitignore'da

Testing:
├── Penetration test (go-live öncesi + yıllık)
├── OWASP ZAP (CI'da nightly)
└── Dependency scanning (CI'da her PR)
```

---

## BÖLÜM 8: TEST STRATEJİSİ

### 8.1 Test Piramidi

```
           ╱────────╲
          ╱   E2E    ╲      ~10%  (Playwright, kritik akışlar)
         ╱────────────╲
        ╱ Integration  ╲    ~30%  (Testcontainers + PG, API + DB)
       ╱────────────────╲
      ╱      Unit        ╲  ~60%  (Services, calculations, validators)
     ╱────────────────────╲
```

### 8.2 Unit Test Kapsamı

- Her Service method → min. 1 happy path + 1 edge case
- Validators → geçerli ve geçersiz girdi
- Calculations → regression fixtures (bkz. §8.3)
- Frontend hooks → React Testing Library + Vitest
- Frontend utilities → Vitest

### 8.3 Regression Fixture Test Suite (Kritik)

Finansal hesaplama modülü için **altın dosya (golden file) yaklaşımı** zorunludur:

**Dizin:** `tests/BudgetTracker.UnitTests/Calculations/fixtures/`

**Dosyalar:**
- `golden_scenario_baseline.json` — mevcut Excel'deki baz senaryo (2,245M gelir, 1,324M hasar, ...)
- `golden_scenario_stressed.json` — Excel'deki kriz senaryosu (Gelir -%20, LR +5pp)
- `golden_historical_YYYY.json` — geçmiş yıl gerçek verileri
- `golden_scenario_fx_usd.json` — USD raporlama dönüşümü

**Test Yapısı:**
```csharp
[Theory]
[InlineData("golden_scenario_baseline.json")]
[InlineData("golden_scenario_stressed.json")]
public async Task KpiCalculator_ShouldMatchGoldenFile(string fixtureName)
{
    var fixture = LoadFixture(fixtureName);
    var result = _calculator.Calculate(fixture.Input);

    Assert.Equal(fixture.Expected.Revenue, result.Revenue);
    Assert.Equal(fixture.Expected.Claims, result.Claims);
    Assert.Equal(fixture.Expected.LossRatio, result.LossRatio, 4);  // 4 ondalık
    Assert.Equal(fixture.Expected.CombinedRatio, result.CombinedRatio, 4);
    Assert.Equal(fixture.Expected.EBITDA, result.EBITDA);
    // ... tüm KPI'lar
}
```

**CI Davranışı:**
- Her PR'da tüm fixture testleri koşar
- Sapma → build fail
- Fixture güncellemesi → explicit PR + code review

**Coverage Hedefi:** Hesaplama modülü için %95.

### 8.4 Integration Testleri

- **Testcontainers + PostgreSQL 16** zorunlu (SQLite yasak — KURAL-039)
- Her Controller için en az bir happy path + bir auth fail testi
- Multi-tenant isolation testi: B şirketinin verisi A şirketinden görünmemeli
- Versiyonlama testleri: onaylanan versiyon değiştirilemez
- Onay akışı testleri: state machine transition'ları
- Excel parser testleri: gerçek `.xlsx` fixture'ları ile

### 8.5 E2E Testleri (Playwright)

**Kritik Akışlar:**
1. Login + MFA + şirket seçimi
2. Yeni bütçe versiyonu oluştur → kalem ekle → submit et
3. Onay kuyruğundan onayla → aktif et
4. Dashboard'da güncel veri görüntüle
5. Variance heatmap'te sapma görüntüle
6. Senaryo oluştur + karşılaştır
7. PDF/Excel export
8. Audit log görüntüleme
9. KVKK silme talebi

### 8.6 Performans Testleri

- **k6** ile 50 eş zamanlı kullanıcı yük testi
- Dashboard, variance, bulk update endpoint'leri hedef
- Hedefler §9'da

### 8.7 Güvenlik Testleri

- **OWASP ZAP** nightly
- **Dependabot + Snyk** her PR
- Penetration test go-live öncesi + yıllık

---

## BÖLÜM 9: PERFORMANS VE SLO HEDEFLERİ

| Metrik | Hedef |
|---|---|
| Dashboard sayfa yükleme | < 2 saniye (p95) |
| API response (standart sorgu) | < 500 ms (p95) |
| API response (aggregation sorgu) | < 1 saniye (p95) |
| Excel import (156 satır) | < 10 saniye |
| Excel import (1000 satır) | < 30 saniye |
| PDF rapor üretimi | < 5 saniye |
| Senaryo hesaplama | < 3 saniye |
| Bulk update (1000 hücre) | < 2 saniye |
| DB sorgu (indexed) | < 200 ms |
| Eş zamanlı kullanıcı | 50+ |
| Uptime | > 99.5% |
| Cache hit ratio (dashboard) | > 80% (invalidation nedeniyle %90 değil) |

---

## BÖLÜM 10: FELAKET KURTARMA

| Hedef | Değer |
|---|---|
| RTO (Recovery Time Objective) | 4 saat |
| RPO (Recovery Point Objective) | 1 saat |
| Backup sıklığı | Günlük tam + saatlik WAL (incremental) |
| Backup retention | 30 gün sıcak + 1 yıl soğuk (arşiv) |
| DR bölgesi | Azure West Europe (cross-region replication) veya ikinci on-prem |
| DR tatbikatı | 6 ayda bir |
| Restore testi | Aylık otomatik (staging'e restore) |

**Runbook'lar:**
- DB corruption
- Region failover
- Point-in-time recovery
- Key Vault restore
- Keycloak restore

---

## BÖLÜM 11: KAYNAK EXCEL VERİ YAPISI

Mevcut Excel dosyalarından çıkarılan referans veri yapısı (import parser geliştirme için):

### 11.1 Gelir Yapısı

```
├── Sigorta Şirketleri (~19 müşteri) — 1.256 Milyar TL (%55.9)
│   ├── SIG-A: 318M TL (en büyük müşteri)
│   ├── SIG-B: 144M TL
│   ├── ... (SIG-C → SIG-T)
│   └── Diğer Sigorta: 227K TL
├── Otomotiv Şirketleri (~16 müşteri) — 647M TL (%28.8)
│   ├── OTO-A: 187M TL
│   ├── OTO-B: 141M TL (yıl içi başlayan)
│   └── ... (OTO-C → OTO-P)
├── Filo Şirketleri (~24 müşteri) — 114M TL (%5.1)
├── Alternatif Kanallar (~19 kanal) — 220M TL (%9.8)
│   ├── ALT-A: 75M TL (ana kanal)
│   └── 18 alt kanal / platform
└── TOPLAM GELİR: 2.245 Milyar TL
```

### 11.2 Hasar Yapısı

```
├── Müşteri bazlı hasar takibi (aynı yapı)
├── Demo Filo düşümü (negatif kalem)
├── Muallak Hasar Kaydı (53.3M TL)
└── TOPLAM HASAR: 1.324 Milyar TL
```

### 11.3 Gider Yapısı

```
├── Personel Giderleri: 524M TL (~%80.7)
├── IT Giderleri: 40M TL
├── Şirket Genel Giderleri: 31M TL
├── Araç Giderleri: 16M TL
├── Araç Giderleri - Tur Filo: 22M TL
├── Pazarlama: 5.9M TL
├── Danışmanlık: 5.3M TL
├── Seyahat: 2.5M TL
├── Konut Konfor: 1.3M TL
├── Ağırlama: 807K TL
├── Finansman Giderleri: 11.5M TL
├── Holding Giderleri: 11.8M TL
└── Diğer Olağan Dışı K/Z: 23.5M TL
```

### 11.4 P&L Yapısı

```
├── Teknik Marj = Gelir − Hasar                    → 921M TL
├── Teknik Kar = Teknik Marj − Genel Giderler      → 272M TL
├── Finansal Gelir                                  → 88M TL
├── T.Katılım                                       → 29.5M TL
├── Amortisman                                      → 23.5M TL
├── Net Kar                                         → 337M TL
└── EBITDA                                          → 360M TL
```

### 11.5 KPI Referans Değerleri (Regression Fixture İçin)

```
Loss Ratio                    : %58.98
Gider Rasyosu                 : %28.91
Combined Ratio                : %87.89
Teknik Kar Rasyosu            : %12.10
Kar Rasyosu                   : %14.99
EBITDA Marjı                  : %16.03
Personel / Gelir              : %23.34
Finansman Gideri / Gelir      : %0.51
Müşteri Konsantrasyon (Top 5) : %37.06
Muallak / Toplam Hasar        : %4.02
```

**Bu değerler `golden_scenario_baseline.json` fixture'ı için referans alınacaktır.**

### 11.6 Bilinen Excel Dosyaları

Parser geliştirme sırasında aşağıdaki dosyalar altın kaynak olarak kullanılacak:

- `Bütçe 2026.xlsx` — ana bütçe
- `Bütçe 2026 Demo.xlsx` — demo/test verisi
- `2026_Budget_01.03.2026.xlsx` — Mart revizyonu
- `Dağıtım Anahtarı ve Bütçesi (Bütçe Rev 7) 05.03.2026.xlsx` — Rev 7 (versiyonlama kanıtı)
- `Tur-Asist KZ 2025-12 V1.xlsx` — 2025 kapanış
- `Tur-Assist KZ 2026-02 - V1.xlsx` — Şubat kapanış
- `Turassist Bütçe 2026 Tahmin - Gerçekleşme 2026 Şubat - V1.xlsx` — Tahmin/gerçekleşme
- `Butce_Analiz_ve_Yazilim_Plani.xlsx` — plan dokümanı

Her dosya için ayrı parser implementasyonu (`IExcelParser` interface). `ParserRegistry` dosya imzasına göre uygun parser'ı seçer.

---

## BÖLÜM 12: AÇIK KARARLAR — **DONDURULDU (2026-04-15)**

> Tüm 8 karar netleştirildi. Detaylı tasarım kararları için bkz. `docs/plans/2026-04-15-acik-kararlar-design.md` ve `docs/plans/2026-04-15-ui-ux-entegrasyon-design.md`.

| # | Konu | Karar | Notlar |
|---|------|-------|--------|
| 1 | **Excel → veri şeması eşleme** | **Hibrit** | Tek seferlik C# migration konsolu (tarihsel veri) + UI'da kalıcı "Aylık Aktüel Yükle" modülü (her ay muhasebeden gelen). Bütçe girişi her zaman UI üzerinden. |
| 2 | **Raporlama para birimi / FX kuralı** | **Çift raporlama** | Tüm tutar tablolarında `amount_original`, `currency_code`, `amount_try_fixed` (yıl başı TCMB), `amount_try_spot` (ay sonu TCMB). `fx_rates` tablosu + Hangfire job (15:45 TR). Varyans raporları "saf operasyonel" ve "FX dahil" iki sütun. |
| 3 | **Expense classification** | **Kategori tablosu + tip enum** | `expense_categories.expense_type` CHECK (`TECHNICAL`/`GENERAL`/`FINANCIAL`). Seed verisi §3.2'de güncellendi. KPI formülleri bu kolondan filtreler. |
| 4 | **Hosting** | **Railway** | Web service + Hangfire worker + PostgreSQL 16, Frankfurt region. KVKK kapsam dışı (kurumsal müşteri verisi, kişisel veri minimal). Docker image portable — gerekirse Azure Turkey'e taşıma yolu açık. |
| 5 | **Auth** | **ASP.NET Identity + OpenIddict** | OpenIddict MIT lisans (Duende ticari lisans gerekir, elendi). Tek process OIDC sunucusu. MFA: TOTP authenticator. AD federasyonu opsiyonel (ileride). |
| 6 | **Data grid** | **AG-Grid Community (MIT)** | Range copy-paste için custom clipboard handler yazılacak. Handsontable ticari lisans gerekir, elendi. TanStack Table ekstra iş yükü, elendi. |
| 7 | **AI forecast modeli (P2)** | **ML.NET SSA + şema hazır** | `Microsoft.ML.TimeSeries` SSA (singular spectrum analysis). MVP'de `forecast_entries` tablosu ve `/api/v1/forecast` endpoint stub olarak hazır; gövde P2'de doldurulacak. Python servis gerekmez. |
| 8 | **ERP entegrasyonu (P2)** | **Adapter pattern, MVP'de CSV** | `IErpAdapter` interface + MVP'de `CsvFileAdapter`. P2'de `LogoAdapter` (mevcut ERP: Logo Tiger). Karar #1 hibrit import modülü bu interface'i kullanır. |

**Karar Tarihi:** 2026-04-15
**Karar Sahibi:** Timur Selçuk Turan (Tur Assist Group)
**Status:** FROZEN — değişiklik için ADR gereklidir.

---

## BÖLÜM 13: UI/UX TASARIM SİSTEMİ

> Bu bölüm, Manus AI tarafından hazırlanan referans dokümandan adapte edilmiştir. Detay için bkz. `docs/plans/2026-04-15-ui-ux-entegrasyon-design.md`.

### 13.1 Tasarım Felsefesi

Kurumsal düzeyde zarif ve kusursuz bir deneyim. Temiz çizgiler, rafine tipografi, dengeli boşluk, profesyonel estetik. Her ekran "özenle tasarlanmış bir finansal araç" hissi vermelidir. Default Tailwind/shadcn şablon görünümünden kaçınılır; kurumsal lacivert kimlik baskındır.

### 13.2 Renk Paleti (OKLCH)

Tüm renkler `src/styles/tokens.css` içinde CSS custom property olarak tanımlanır. Hardcoded hex/rgb yasaktır.

| Token | OKLCH | Kullanım |
|-------|-------|----------|
| `--color-primary` | `oklch(0.30 0.06 260)` | Ana lacivert — butonlar, vurgu |
| `--color-background` | `oklch(0.985 0.002 250)` | Sayfa arka planı — çok hafif mavi-gri |
| `--color-foreground` | `oklch(0.18 0.03 260)` | Ana metin — koyu lacivert |
| `--color-card` | `oklch(1 0 0)` | Kart arka planı — saf beyaz |
| `--color-muted` | `oklch(0.955 0.005 250)` | İkincil alanlar — açık gri |
| `--color-muted-foreground` | `oklch(0.50 0.02 260)` | Yardımcı metin — orta gri |
| `--color-destructive` | `oklch(0.55 0.22 25)` | Hata, negatif sapma — kırmızı |
| `--color-border` | `oklch(0.91 0.005 250)` | İnce kenarlık |
| `--color-sidebar` | `oklch(0.22 0.04 260)` | Sidebar arka planı — koyu lacivert |
| `--color-sidebar-foreground` | `oklch(0.92 0.005 250)` | Sidebar metin — açık beyaz |

### 13.3 Grafik Renkleri (Recharts)

| Token | OKLCH | Anlam |
|-------|-------|-------|
| `--chart-1` | `oklch(0.30 0.06 260)` | Lacivert — Gelir, birincil seri |
| `--chart-2` | `oklch(0.55 0.15 250)` | Mavi — ikincil seri |
| `--chart-3` | `oklch(0.65 0.12 170)` | Yeşil — Teknik Marj, pozitif |
| `--chart-4` | `oklch(0.70 0.14 60)` | Amber — EBITDA, uyarı |
| `--chart-5` | `oklch(0.60 0.18 30)` | Kırmızı — Hasar, negatif |

### 13.4 Tipografi

- **Font ailesi:** Inter (Google Fonts CDN, `font-display: swap`, sadece kritik weight preload)
- **OpenType özellikleri:** `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` (sayısal okunabilirlik için karakter varyantları)
- **Sayısal hücreler:** `tabular-nums` zorunlu (sağ hizalı)

| Kullanım | Stil |
|----------|------|
| Sayfa başlığı (h1) | `text-2xl font-semibold tracking-tight` |
| Kart başlığı (h2) | `text-base font-medium` |
| KPI değeri | `text-2xl font-semibold tracking-tight` (`.kpi-value`) |
| KPI etiketi | `text-xs font-medium uppercase tracking-wider` (`.kpi-label`) |
| Tablo metni | `text-sm` |
| Yardımcı metin | `text-sm text-muted-foreground` |

### 13.5 Bileşen Stilleri

**KPI Kartları:** `shadow-sm hover:shadow-md rounded-lg p-5`. Sağ üstte renkli ikon kutusu, sol tarafta etiket → değer → açıklama hiyerarşisi. Hover state designed (compositor-friendly transform/opacity).

**Tablolar:** Zebra deseni yok. `hover:bg-muted/50` + `border-b`. Sayısal sütunlar `tabular-nums text-right`. Sticky header.

**Sidebar:** Koyu lacivert (`--color-sidebar`), beyaz metin/ikon. Aktif menü öğesi `sidebar-accent` arka planıyla vurgulanır. Alt kısımda kullanıcı avatarı + çıkış menüsü. Lucide ikonları kullanılır.

**Animasyon:** Sadece `transform`, `opacity`, `clip-path` üzerinde. `--duration-fast: 150ms`, `--duration-normal: 300ms`, `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`.

---

## BÖLÜM 14: SAYFA YAPISI VE İÇERİKLERİ

### 14.1 Sidebar Navigasyon

8 sayfa, koyu lacivert sidebar. Lucide ikonları:

| Sıra | İkon | Menü | Yol | Erişim |
|------|------|------|-----|--------|
| 1 | `LayoutDashboard` | Dashboard | `/` | Tüm kullanıcılar |
| 2 | `FileSpreadsheet` | Bütçe Girişi | `/budget-entry` | Tüm kullanıcılar |
| 3 | `Receipt` | Gider Girişi | `/expense-entry` | Tüm kullanıcılar |
| 4 | `BarChart3` | BvA Raporu | `/bva-report` | Tüm kullanıcılar |
| 5 | `TrendingUp` | Trend Analizi | `/trends` | Tüm kullanıcılar |
| 6 | `BookOpen` | Müşteri Rehberi | `/customers` | Tüm kullanıcılar |
| 7 | `Upload` | Veri Aktarımı | `/import` | Tüm kullanıcılar |
| 8 | `Settings` | Ayarlar | `/settings` | Yalnızca Admin |

Departman yöneticisi rolünde Müşteri/BvA/Trend/Dashboard sayfaları **otomatik olarak atanmış segmente filtrelenir** (RLS + EF query filter).

### 14.2 Dashboard (`/`) — Finansal KPI

Üst kısımda dönem + dataType (Bütçe/Gerçekleşen) + (admin ise) segment seçici. Aşağıdaki bileşenler yukarıdan aşağıya:

**Üst Sıra — 4 KPI Kartı:**

| KPI | Hesaplama | İkon Rengi |
|-----|-----------|------------|
| Toplam Gelir | Σ tüm müşterilerin gelirleri | `--chart-1` (lacivert) |
| Toplam Hasar | Σ tüm müşterilerin hasarları | `--chart-5` (kırmızı) |
| Teknik Marj | Gelir − Hasar | `--chart-3` (yeşil) |
| EBITDA | Net Kar/Zarar + Amortisman | `--chart-4` (amber) |

**Alt Sıra — 4 KPI Kartı:**

| KPI | Formül |
|-----|--------|
| Loss Ratio | Hasar / Gelir |
| Combined Ratio | Loss Ratio + Gider Rasyosu |
| Gider Rasyosu | GG Toplam / Gelir |
| Personel / Gelir Oranı | Personel Giderleri / Gelir |

**Grafikler:**
- **Aylık Gelir & Hasar bar chart** (12 ay yan yana, lacivert vs kırmızı)
- **Segment Dağılımı donut chart** (her segmentin gelir payı)

**Segment Bazlı Performans Tablosu:**
Sütunlar: Segment | Gelir | Hasar | Teknik Marj | Loss Ratio | Gelir Payı (%)

**Top 5 Müşteri & Konsantrasyon:**
Gelire göre sıralı ilk 5 müşteri + **Müşteri Konsantrasyon Oranı** KPI = (Top 5 Geliri / Toplam Gelir). Yüksek oran (>%50) konsantrasyon riski sinyali.

**Gider Kırılımı:**
Her gider kategorisi için yatay progress bar; kategori adı + tutar + toplam içindeki yüzde.

**Net Kar/Zarar Formül Zinciri (Görsel):**
8 adımlık yatay kutucuk akışı — okla bağlı:

```
Toplam Gelir → Toplam Hasar → Teknik Marj → GG Toplam →
Teknik Kar → Finansal Gelir → Net Kar/Zarar → EBITDA
```

Her kutucukta tutar + bir önceki adıma göre sapma rengi.

### 14.3 Bütçe Girişi (`/budget-entry`)

Filtre çubuğu: dönem | versiyon | segment | dataType (bütçe/gerçekleşen) | lineType (gelir/hasar).

**AG-Grid Community** tablosu:
- Sol kolonlar (frozen): Müşteri Kodu, Firma Adı, Segment
- Orta kolonlar: Ocak..Aralık (12 sayısal hücre, `cellEditor: 'agNumberCellEditor'`)
- Sağ kolon (frozen, computed): Toplam (read-only)
- Custom clipboard handler: Excel'den range copy-paste desteği

Değişiklikler lokal Zustand state'inde tutulur, "Kaydet" butonu `bulkUpsert` ile toplu submit eder. Optimistic update + rollback. Onay workflow ile etkileşim: aktif versiyon `DRAFT` değilse grid read-only.

### 14.4 Gider Girişi (`/expense-entry`)

Üç bölümlü tablo:

1. **Gider Kalemleri (düzenlenebilir, 7 satır):**
   - Personel Giderleri, Şirket Genel Giderleri, IT Giderleri, Araç Giderleri, Finansman Giderleri, Holding Giderleri, Diğer Giderler

2. **GG Toplam (otomatik, read-only):** Yukarıdaki 7 satırın aylık toplamı.

3. **P&L Ek Kalemleri (düzenlenebilir, 2 satır):**
   - Finansal Gelir, Amortisman
   - Bunlar formül zincirinde Teknik Kar sonrasında devreye girer.

### 14.5 BvA Raporu (`/bva-report`)

4 bölüm:

1. **Aylık Gelir BvA grafiği** — Bütçe vs Gerçekleşen, 12 ay yan yana bar chart.
2. **Aylık Gelir BvA tablosu** — Ay | Bütçe | Gerçekleşen | Sapma (₺) | Sapma (%). Negatif sapmalar kırmızı, pozitif yeşil.
3. **Yıllık Net Kar/Zarar Karşılaştırması** — Formül zincirinin her adımı için Bütçe | Gerçekleşen | Sapma.
4. **Segment BvA Tablosu** — Her segment için Gelir/Hasar/Teknik Marj bütçe vs gerçekleşen.

### 14.6 Trend Analizi (`/trends`)

5 grafik:

1. **Kümülatif YTD Gelir & Hasar** — Area chart (yıl başından birikimli).
2. **Aylık Büyüme (MoM)** — Bar chart (gelir & hasar büyüme yüzdeleri).
3. **Loss Ratio Trendi** — Line chart (12 aylık LR değişimi).
4. **Bütçe Gerçekleşme Oranı** — Sadece "gerçekleşen" modda görünür; her ayın bütçeye göre yüzdesi.
5. **Aylık Teknik Marj** — Bar chart.

### 14.7 Müşteri Rehberi (`/customers`)

Üst kısım: metin arama + segment filtresi.
Tablo: Kod | Firma Adı | Segment | Durum (Aktif/Pasif badge) | Başlangıç Tarihi | İşlemler.
Admin: yeni müşteri ekle (modal) + sil. Departman yöneticisi: sadece kendi segmentini görür.

### 14.8 Veri İçe / Dışa Aktarma (`/import`)

3 sekme:

**1) İçe Aktar:**
- Excel (.xlsx, .xls) ve CSV (.csv) kabul edilir
- Kullanıcı veri tipini (Gelir/Hasar veya Gider), dönem, bütçe/gerçekleşen seçer
- Sürükle-bırak veya tıklama
- Satır bazlı validasyon; bulunamayan müşteri kodları ve geçersiz kategoriler hata listesinde
- `IErpAdapter` interface üzerinden çalışır (MVP'de `CsvFileAdapter`)

**2) Dışa Aktar:**
- Mevcut verileri Excel (.xlsx) olarak indirir
- İki buton: Gelir/Hasar Verisi | Gider Verisi
- ClosedXML ile generate edilir

**3) Şablonlar:**
- Boş Gelir/Hasar şablonu, boş Gider şablonu
- Doğru sütun başlıkları + örnek satır

**Şablon formatları:**

Gelir/Hasar:
```
Müşteri Kodu | Tür   | Ocak   | Şubat  | ... | Aralık
SIG-001      | gelir | 150000 | 160000 | ... | 200000
SIG-001      | hasar |  80000 |  85000 | ... | 110000
```

Gider:
```
Kategori           | Ocak   | Şubat  | ... | Aralık
Personel Giderleri | 500000 | 500000 | ... | 550000
IT Giderleri       | 120000 | 120000 | ... | 130000
```

### 14.9 Ayarlar (`/settings`) — Admin

İki bölüm:

1. **Dönem & Versiyon Yönetimi:** Yeni bütçe yılı oluştur, mevcut versiyonları listele, aktif versiyon değiştir.
2. **Kullanıcı Yönetimi:** Tüm kullanıcılar listesi. Her kullanıcı için rol (Admin/Departman Yöneticisi/Finance/CFO) ve atanmış segment(ler) değiştirilebilir. E-posta + son giriş tarihi.

### 14.10 Erişim Matrisi

| İşlev | Admin | Finance | CFO | Departman Yöneticisi |
|-------|-------|---------|-----|----------------------|
| Dashboard | Tüm segmentler | Tüm | Tüm | Atanmış segment(ler) |
| Bütçe girişi | Tüm | — | — | Kendi segmenti |
| Gider girişi | Evet | Evet | — | Hayır |
| BvA raporu | Tüm | Tüm | Tüm | Atanmış |
| Trend analizi | Tüm | Tüm | Tüm | Atanmış |
| Onay (DEPT_APPROVED) | — | — | — | Evet (kendi segmenti) |
| Onay (FINANCE_APPROVED) | — | Evet | — | — |
| Onay (CFO_APPROVED) | — | — | Evet | — |
| Müşteri ekle/sil | Evet | Hayır | Hayır | Hayır |
| Versiyon oluştur | Evet | Evet | — | — |
| Kullanıcı yönetimi | Evet | Hayır | Hayır | Hayır |
| Excel import/export | Evet | Evet | Evet | Kendi segmenti |
| Ayarlar sayfası | Evet | Hayır | Hayır | Gizli |

---

## BÖLÜM 15: PARA BİRİMİ & SAYI FORMATLAMA

### 15.1 Türk Lirası Kısaltma Kuralları (Frontend)

Büyük tutarlar okunabilirlik için kısaltılır. Tüm UI'da `lib/format.ts` içindeki `formatTRY()` fonksiyonu kullanılır.

| Aralık | Format | Örnek |
|--------|--------|-------|
| ≥ 1 Milyar | `X.XX Mrd ₺` | 1.25 Mrd ₺ |
| ≥ 1 Milyon | `X.X Mln ₺` | 45.3 Mln ₺ |
| ≥ 1 Bin | `X Bin ₺` | 850 Bin ₺ |
| < 1 Bin | `X ₺` | 750 ₺ |

### 15.2 Yüzde Formatı

`%X.XX` formatı, iki ondalık basamak, Türkçe yerel ayar (virgül ondalık ayraç olabilir; UI tutarlılığı için **nokta** kullanılır). Örnek: `%65.42`.

### 15.3 Sayısal Hücreler

- `tabular-nums` CSS class zorunlu (sağ hizalı sütunlarda)
- Negatif değerler kırmızı + parantez içinde: `(45.3 Mln ₺)`
- Sıfır: `—` (em dash) görünür, hücre boşmuş gibi durmaz

### 15.4 Çoklu Para Birimi Görünümü

Çift raporlama (Karar #2) gereği bazı raporlarda iki sütun gösterilir:
- **TRY (Yıl Başı Kuru)** — bütçe karşılaştırma için
- **TRY (Spot)** — gerçek nakit akışı için

Kullanıcı dashboard üst kısmındaki toggle ile hangisini görmek istediğini seçer; tercih `localStorage` üzerinden `ui_state` Zustand store'a yazılır.

---

## REFERANSLAR VE EKLER

**Aktif tasarım dokümanları:**
- `docs/plans/2026-04-15-acik-kararlar-design.md` — 8 dondurulmuş açık kararın gerekçeleri
- `docs/plans/2026-04-15-ui-ux-entegrasyon-design.md` — UI/UX entegrasyon kayıtları (Bölüm 13/14/15 için kaynak izleme)

**Dış referanslar:**
- `Butce_Analiz_ve_Yazilim_Plani.xlsx` — Tur Assist Group orijinal Excel analiz dosyası (kullanıcının iCloud klasöründe)

**Arşiv notu:** Önceki versiyonlardaki `2026-04-15-butce-yazilimi-revize-plan.md`, `2026-04-15-spec-degerlendirme.md` ve `Bütçe Yönetim Sistemi — Kapsamlı Proje Dokümanı.md` (Manus AI v1.0) dosyaları 2026-04-15 tarihinde silindi; içerikleri bu master spec'e ve yukarıdaki iki tasarım dokümanına entegre edildi.

---

> **NOT:** Bu doküman, bütçe takip yazılımının teknik ve fonksiyonel referansıdır. Her modül geliştirmeye başlamadan önce ilgili bölüm okunmalı; yapılan kararlar ve sapmalar ADR olarak `docs/architecture.md`'ye eklenmelidir. Her release sonunda CHANGELOG.md güncellenmelidir.
