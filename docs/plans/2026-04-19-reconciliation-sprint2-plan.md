# Sprint 2 — Mutabakat Case/Line + UI Implementation Plan

- **Tarih:** 2026-04-19
- **Süre:** 3 hafta (15 iş günü)
- **Design doc:** `docs/plans/2026-04-19-reconciliation-sprint2-3-design.md`
- **Branch stratejisi:** her task kendi branch'inde; birleşik Sprint 2 PR ayrı epic branch'ten
- **Commit stili:** Conventional (`feat(reconciliation): ...`, `test(reconciliation): ...`, `fix(reconciliation): ...`)
- **Test kuralı:** Her production code değişikliğinden önce failing test (TDD). Integration testler Testcontainers + gerçek Postgres.

---

## Hedef (Definition of Done)

Sprint 2 sonunda:

1. Batch yüklendiğinde parse + Case/Line otomatik üretimi **atomic** çalışır.
2. `ReconciliationLine.Status` PriceBook lookup sonucu doğru atanır (`Ready` / `PricingMismatch` / `Rejected`).
3. Customer eşleşmeyen satırlar UnmatchedCustomers bucket'ında görünür; ReconAgent `/link-external` ile eşleyip Case'leri tetikleyebilir.
4. **S3 Batch Detay** + **S4 Sigorta Case Listesi** + **S5 Otomotiv Case Listesi** + **S6 Case Detay + Lines Grid** çalışır.
5. Case state machine `Draft → UnderControl → PricingMatched` geçişleri zorlanır.
6. D.1 pilot seed CSV + bulk import çalışır.
7. D.2 cleanup PR merge edildi; ReconAgent 403 / FinanceManager 200 integration testleri geçer.
8. D.3 ADR-0016 yazıldı.
9. Integration test coverage ≥ %80.
10. CHANGELOG güncellendi, Sprint 2 PR açıldı.

---

## Stack Hatırlatma

| Katman | Araç |
|---|---|
| Backend | .NET 10 + ASP.NET Core + EF Core 10 |
| DB | PostgreSQL 16 (Testcontainers) |
| Parser | ClosedXML + CsvHelper (Sprint 1 mevcut) |
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 |
| State | Zustand (UI) + TanStack Query (server) |
| Grid | Custom `<table>` (listeler) + AG-Grid Community (Lines Grid) |
| Testing | xUnit + NSubstitute + Testcontainers (backend); Vitest + Playwright (frontend) |
| i18n | react-i18next (TR default, EN mirror) |

---

## Hafta 1 — Temizlik + Backend Auto-Creation

### Task 1 — ADR-0016 (D.3 karar dokümantasyonu)

**Süre:** 30 dk — Gün 1 sabah. (ADR-0014/0015 sırasıyla Kontrat Kodu Domain'i + PriceBook Altyapısı olarak mevcut — bu nedenle 0016.)

- **Branch:** `docs/adr-0016-reconciliation-id-type`
- **Dosya:** `docs/architecture.md` (mevcut)
- **Adımlar:**
  1. `docs/architecture.md` içindeki `## ADR-XXXX — [Başlık]` template'inden önce `## ADR-0016 — Mutabakat Modülü Entity ID Tipi: int (Guid değil)` bölümü ekle.
  2. İçerik: durum (kabul), bağlam (spec UUID ister, impl int), karar (int kalsın), reddedilen alternatifler (tam refactor, karışık model), sonuçlar (olumlu/olumsuz), kabul kriterleri.
  3. Commit: `docs(architecture): ADR-0016 — reconciliation ID type decision`.
- **Doğrulama:** `grep -c "^## ADR-0016" docs/architecture.md` → 1.

---

### Task 2 — Cleanup PR (D.2 policy alias + 403 testleri)

**Süre:** 1 gün — Gün 1.

- **Branch:** `fix/reconciliation-policy-alias-cleanup`
- **Amaç:** `PriceBooksController` + `ContractsController` + `PricingController` içindeki `RequireFinanceRole` / `Cfo` alias'larını spec'teki `PriceBook.Edit` / `PriceBook.Approve` policy'lerine geçir.

#### Adımlar

1. **Test yaz** (failing):
   - Dosya: `tests/BudgetTracker.IntegrationTests/Reconciliation/PriceBookPolicyTests.cs` (yeni)
   - Case 1: `ReconAgent` rolü `POST /api/v1/contracts/{id}/price-books` → 200 (PriceBook.Edit geçer)
   - Case 2: `ReconAgent` rolü `POST /api/v1/price-books/{id}/approve` → 403 (PriceBook.Approve geçmez)
   - Case 3: `FinanceManager` → her ikisi 200
   - Case 4: `Cfo` → her ikisi 200
   - Komut: `dotnet test tests/BudgetTracker.IntegrationTests --filter FullyQualifiedName~PriceBookPolicyTests` → 4 test fail.

2. **Policy değişikliği**:
   - Dosya: `src/BudgetTracker.Api/Controllers/PriceBooksController.cs`
   - Her action üstündeki `[Authorize(Policy = "...")]` attribute'larını spec'e göre değiştir:
     - `POST contracts/{id}/price-books` → `[Authorize(Policy = "PriceBook.Edit")]`
     - `POST /price-books/{id}/approve` → `[Authorize(Policy = "PriceBook.Approve")]`
     - `POST /price-books/{id}/items/bulk` → `[Authorize(Policy = "PriceBook.Edit")]`
   - `ContractsController` → CRUD için `PriceBook.Edit`, terminate için `PriceBook.Approve`.

3. **Test çalıştır** → 4 test geçer.

4. **Regresyon koruması**: `dotnet test` → tüm suite yeşil.

5. **Commit**: `fix(reconciliation): switch pricebook controllers to spec policies + 403 integration tests`.

---

### Task 3 — Pilot Seed CSV (D.1)

**Süre:** 0.5 gün — Gün 2 sabah.

- **Branch:** `feat/reconciliation-pilot-seed`
- **Dosyalar:**
  - `docs/Mutabakat_Modulu/seed/pricebook-pilot-seed.csv` (yeni)
  - `docs/Mutabakat_Modulu/seed/README.md` (yükleme komutu + rationale)
  - `scripts/seed-pricebook-pilot.sh` (yeni, opsiyonel)

#### Adımlar

1. **CSV oluştur** — 3 sigorta + 3 otomotiv, her biri için aktif PriceBook + 5-10 kalem:
   - Sigorta: `MAPFRE`, `AKSIGORTA`, `ANADOLU` için `PKT-STD`, `PKT-PREMIUM`, `PKT-EKO`, `YOLYARD-30`, `YOLYARD-60`
   - Otomotiv: `TOYOTA`, `RENAULT`, `DOGUS` için `CEKICI`, `IKAME-1G`, `IKAME-3G`, `MINI-ONR`, `LASTIK-YRD`
   - Format: `customer_code,contract_code,flow,effective_from,currency_code,product_code,product_name,item_type,unit,unit_price,tax_rate`
   - Mock fiyatlar: sigorta 50-500 TL, otomotiv 150-2500 TL

2. **Yükleme dokumentasyonu** — `seed/README.md` içinde 3 adım:
   - `psql` ile Customer tablosundan `customer_code` → `id` eşleme çıkar
   - Her PriceBook için `POST /api/v1/contracts` + `POST /api/v1/contracts/{id}/price-books` + `POST /api/v1/price-books/{id}/items/bulk` (CSV upload)
   - Son `POST /api/v1/price-books/{id}/approve`

3. **Doğrulama:**
   - Admin user ile `/pricing/lookup` sayfasında `MAPFRE + PKT-STD + 2026-04` → `Found` + birim fiyat.
   - Playwright smoke: `client/e2e/reconciliation-pilot-seed.spec.ts` (yeni, opsiyonel).

4. **Commit:** `feat(reconciliation): add pilot pricebook seed CSV + load script`.

---

### Task 4 — Case Auto-Creation Domain Logic

**Süre:** 1 gün — Gün 2 öğleden sonra + Gün 3.

- **Branch:** `feat/reconciliation-case-auto-create`
- **Hedef:** Parse sonrası `SourceRow`'lar `(customer_id, period_code, flow)` ile gruplanır, `ReconciliationCase` otomatik üretilir.

#### Adımlar

1. **Test yaz** (failing, unit):
   - Dosya: `tests/BudgetTracker.UnitTests/Reconciliation/ReconciliationCaseAutoCreatorTests.cs` (yeni)
   - Case 1: 100 SourceRow (10 müşteri × 10 satır) → 10 Case üretilir, her Case'te 10 Line.
   - Case 2: Aynı müşteri + farklı period → 2 ayrı Case.
   - Case 3: Aynı müşteri + aynı period + aynı flow → **unique constraint ihlal gelmez** (mevcut Case'e line eklenir).
   - Case 4: Customer eşleşmez → SourceRow.parse_status=Warning, Case oluşmaz.

2. **Domain service**:
   - Dosya: `src/BudgetTracker.Application/Reconciliation/Cases/IReconciliationCaseAutoCreator.cs`
   - Dosya: `src/BudgetTracker.Infrastructure/Reconciliation/Cases/ReconciliationCaseAutoCreator.cs`
   - Signature: `Task<CaseAutoCreateResult> CreateCasesForBatchAsync(int batchId, int companyId, CancellationToken ct)`
   - Return: `{ CreatedCaseIds: int[], UnmatchedRowCount: int, TotalLinesCreated: int }`

3. **Customer lookup**:
   - Her SourceRow için `Customer.FindByExternalRefAsync(external_customer_ref, companyId)` çağrısı (mevcut 00a endpoint'inin iç servisi).
   - Null dönerse SourceRow.parse_status = `Warning`, `raw_payload`a `"unmatched": true` eklenir, Case üretmez.

4. **Case + Line yaratma (atomic)**:
   - EF Core transaction içinde — tüm SourceRow'lar tek pas gezilir, Case'ler dictionary'de biriktirilir, son `SaveChangesAsync()`.
   - Case `CreateDraft(companyId, flow, periodCode, customerId, ownerUserId=null)` (spec: owner sonradan atanır).
   - Line `Create(caseId, sourceRowId, productCode, ...)` — PriceBook lookup Task 5'te eklenecek; şimdilik `status=PendingReview`, `unit_price=0`.

5. **Test geçer** → `dotnet test tests/BudgetTracker.UnitTests --filter Category=CaseAutoCreate` → yeşil.

6. **Integration test**:
   - Dosya: `tests/BudgetTracker.IntegrationTests/Reconciliation/CaseAutoCreateIntegrationTests.cs`
   - Gerçek Postgres + Testcontainers + 100 satırlık sigorta Excel'i yükle → 10 Case + 100 Line üretildiğini doğrula.

7. **Commit:** `feat(reconciliation): case auto-creation from parsed batches`.

---

### Task 5 — PriceBook Lookup Entegrasyonu

**Süre:** 1 gün — Gün 4.

- **Branch:** `feat/reconciliation-pricebook-lookup-integration`
- **Hedef:** Line yaratılırken `IPricingLookupService` (00b'de mevcut) çağrılır; `Status` atanır.

#### Adımlar

1. **Test yaz** (failing, unit):
   - Dosya: `tests/BudgetTracker.UnitTests/Reconciliation/LinePricingResolverTests.cs`
   - Case 1: PriceBook'ta ürün var + fiyat eşleşir → `Status=Ready`, `unit_price` PriceBook'tan.
   - Case 2: PriceBook'ta ürün var + `unit_price_expected` farklı → `Status=PricingMismatch`, `dispute_reason_code=PRICE_MISMATCH`.
   - Case 3: Contract yok → `Status=Rejected`, `dispute_reason_code=OTHER` + not `CONTRACT_NOT_FOUND`.
   - Case 4: Product yok → `Status=Rejected`, `dispute_reason_code=PKG_NOT_IN_CONTRACT`.

2. **Resolver servisi**:
   - Dosya: `src/BudgetTracker.Application/Reconciliation/Lines/ILinePricingResolver.cs`
   - Dosya: `src/BudgetTracker.Infrastructure/Reconciliation/Lines/LinePricingResolver.cs`
   - `IPricingLookupService` inject → per-row lookup.
   - `LookupResult.Match` → `LineStatus` eşlemesi.

3. **AutoCreator entegrasyonu**:
   - `ReconciliationCaseAutoCreator.CreateCasesForBatchAsync` içinde her Line için resolver çağrısı.
   - Performance: batch lookup yap (contract_id per customer cache'le — aynı Case'in tüm line'ları tek contract'a bağlı).

4. **Test geçer** + integration test (`batch_with_pricing_mismatch.xlsx` fixture).

5. **Commit:** `feat(reconciliation): integrate pricebook lookup into line creation`.

---

### Task 6 — Audit Event'leri Genişletme

**Süre:** 0.5 gün — Gün 5 sabah.

- **Branch:** `feat/reconciliation-case-audit-events`
- **Hedef:** Yeni event'ler: `ReconciliationCaseOpened`, `ReconciliationLineResolved`, `ReconciliationUnmatchedCustomerDetected`.

#### Adımlar

1. **Event sabitlerini ekle:** `src/BudgetTracker.Application/Audit/IAuditLogger.cs` → 3 yeni `const string`.
2. **Servislerde kayıt çağrıları:** AutoCreator ve LinePricingResolver sonunda `_audit.LogAsync(...)`.
3. **Test:** unit test ile event'lerin fired olduğunu doğrula (NSubstitute).
4. **Commit:** `feat(reconciliation): audit events for case auto-creation`.

---

## Hafta 2 — API + UnmatchedCustomers + İlk UI

### Task 7 — Cases + Lines REST API

**Süre:** 1.5 gün — Gün 6 + Gün 7 sabah.

- **Branch:** `feat/reconciliation-cases-api`
- **Controller:** `src/BudgetTracker.Api/Controllers/ReconciliationCasesController.cs` (yeni)

#### Endpoint'ler

- `GET /api/v1/reconciliation/cases?flow=&period_code=&status=&customer_id=&owner_user_id=` → liste
- `GET /api/v1/reconciliation/cases/{id}` → detay (lines dahil)
- `POST /api/v1/reconciliation/cases/{id}/assign-owner` body: `{userId}` — Policy: `Reconciliation.Manage`
- `POST /api/v1/reconciliation/cases/{id}/ready-for-accounting` — state machine geçiş; Sprint 2 MVP'de buton iskeleti; ancak müşteri onayından önce kullanılmaz (Sprint 3'te bağlanır)
- `PATCH /api/v1/reconciliation/lines/{id}` body: `{unitPrice?, quantity?, note?}` — Policy: `Reconciliation.Manage`
- `POST /api/v1/reconciliation/lines/{id}/ready` — status=Ready zorlaması — Policy: `Reconciliation.Manage`

#### Adımlar

1. **Test yaz** — her endpoint için 200 + 403 senaryosu (`ReconciliationCasesControllerTests.cs`).
2. **Controller + Service interface** (`IReconciliationCaseService` + impl).
3. **DTO'lar**: `CaseSummaryDto`, `CaseDetailDto` (lines array), `UpdateLineRequest`, `AssignOwnerRequest`.
4. **State machine validation**: Case status transition kuralı (Draft → UnderControl sadece owner atanınca). Domain exception yakalanıp 409 dönsün.
5. **Commit:** `feat(reconciliation): REST API for cases and lines`.

---

### Task 8 — UnmatchedCustomers Bucket

**Süre:** 1 gün — Gün 7 öğleden sonra + Gün 8.

- **Branch:** `feat/reconciliation-unmatched-customers`

#### Adımlar

1. **API endpoint:**
   - `GET /api/v1/reconciliation/batches/{id}/unmatched-customers` → unique `external_customer_ref` listesi + `row_count` + `sample_rows`.
   - `POST /api/v1/reconciliation/batches/{id}/unmatched-customers/{ref}/link` body: `{customerId}` — mevcut `/customers/{id}/link-external` akışını çağırır, sonra batch'e özgü Case üretimini tekrar tetikler.

2. **Servis:** `IReconciliationUnmatchedCustomerService` + impl — `SourceRow.raw_payload->"unmatched"` sorgusu.

3. **Test:** 50 satırlık batch, 5 müşterisi eşleşmeyen senaryo → endpoint 5 kayıt döner; link sonrası `GET unmatched` 4'e düşer, 1 yeni Case oluşur.

4. **Commit:** `feat(reconciliation): unmatched customers bucket + link flow`.

---

### Task 9 — Frontend: S3 Batch Detay Ekranı

**Süre:** 1.5 gün — Gün 9 + Gün 10 sabah.

- **Branch:** `feat/reconciliation-ui-batch-detail`

#### Dosyalar

- `client/src/pages/ReconciliationBatchDetailPage.tsx` (yeni)
- `client/src/components/reconciliation/api.ts` (genişlet: `getBatchById` zaten var; `listUnmatchedCustomers`, `linkUnmatchedCustomer` ekle)
- `client/src/App.tsx` (yeni route: `/mutabakat/batches/:id`)
- `client/src/pages/ReconciliationBatchesPage.tsx` (satır tıklama → navigate)
- `client/src/shared/i18n/tr.json` + `en.json` (yeni key'ler)

#### Sayfa yapısı

1. **Üst özet kartı:** akış, dönem, dosya adı, yüklenme tarihi, row_count, ok/warning/error sayıları.
2. **Durum sekmesi:**
   - Tab 1: **Case'ler** — bu batch'ten üretilmiş Case listesi (linkle S6'ya gider)
   - Tab 2: **Eşlenmemiş Müşteriler** — external_ref + satır sayısı + "Müşteriye eşle" butonu (modal)
   - Tab 3: **Parse Hataları** — error satırları + ham JSON payload + satır numarası
3. **Aksiyonlar:** "Draft'sa Sil" butonu (status=Draft ise görünür) — DELETE endpoint'i.

#### TanStack Query hooks

- `useBatchDetail(id)` → `getBatchById`
- `useBatchCases(batchId)` → `listCases({batchId})` (yeni filtre eklenecek)
- `useUnmatchedCustomers(batchId)` → `listUnmatchedCustomers(batchId)`

#### Playwright smoke

- `client/e2e/reconciliation-batch-detail.spec.ts` — batch upload → detaya git → 3 tabın açıldığını doğrula.

- **Commit:** `feat(reconciliation): batch detail page with cases + unmatched + errors tabs`.

---

### Task 10 — Frontend: S4 Sigorta Case Listesi + S5 Otomotiv Case Listesi

**Süre:** 1 gün — Gün 10 öğleden sonra + Gün 11 sabah.

- **Branch:** `feat/reconciliation-ui-case-lists`

#### Yaklaşım

Tek sayfa iki tab — Sigorta + Otomotiv. Flow filtresi sidebar'dan gelmiyor, sayfa içinde tab.

#### Dosyalar

- `client/src/pages/ReconciliationCasesPage.tsx` (yeni) — route `/mutabakat/cases`
- `client/src/components/reconciliation/api.ts` (genişlet: `listCases`, `assignCaseOwner`)
- `client/src/components/layout/sidebar-config.ts` — Mutabakat bölümüne yeni satır:
  ```typescript
  { label: 'Case Listesi', to: '/mutabakat/cases', icon: 'folder_shared' }
  ```
- `client/src/App.tsx` — yeni route

#### Sayfa yapısı

1. Tab: **Sigorta** | **Otomotiv**
2. Filtreler: dönem, status (Draft/UnderControl/PricingMatched), sahip
3. Custom `<table>`: müşteri (kod + ad) | dönem | status chip | sahip | line sayısı | toplam tutar | aksiyon (→ S6)
4. Boş durum + "Batch yükle" CTA

- **Commit:** `feat(reconciliation): case list page for insurance and automotive flows`.

---

## Hafta 3 — Case Detay + State Machine + Kapanış

### Task 11 — Frontend: S6 Case Detay + Lines Grid

**Süre:** 2.5 gün — Gün 11 öğleden sonra + Gün 12 + Gün 13.

- **Branch:** `feat/reconciliation-ui-case-detail`

#### Dosyalar

- `client/src/pages/ReconciliationCaseDetailPage.tsx` (yeni) — route `/mutabakat/cases/:id`
- `client/src/components/reconciliation/CaseLinesGrid.tsx` (yeni, AG-Grid wrapper)
- `client/src/App.tsx` — yeni route

#### Sayfa yapısı

1. **Üst bilgi kartı:** müşteri + dönem + akış + sahip + status chip + toplam tutar
2. **Aksiyonlar:**
   - "Sahibi Üstlen" (owner_user_id null ise veya eski owner'dansa)
   - "Kontrol Et → UnderControl" (Draft'sa ve owner varsa)
   - "PricingMatched" (tüm line'lar `Ready` ise)
   - "Müşteriye Gönder" (Sprint 3'te aktifleşir, şimdilik disabled + tooltip)
3. **Lines Grid (AG-Grid):**
   - Kolonlar: ürün_kodu, ürün_adı, quantity (editable), unit_price (editable), amount (computed), status chip, action menu
   - Row action: "Ready" / "Dispute" (dispute modal Sprint 3)
   - Inline edit → `PATCH /lines/{id}` çağrısı

#### Tests

- `client/src/pages/ReconciliationCaseDetailPage.test.tsx` (Vitest + RTL) — render + aksiyon butonu koşulları.
- Playwright smoke: case aç → line edit → status butonu → state geçiş.

- **Commit:** `feat(reconciliation): case detail page with ag-grid lines editor`.

---

### Task 12 — State Machine Enforcement

**Süre:** 0.5 gün — Gün 14 sabah.

- **Branch:** `feat/reconciliation-case-state-machine`
- **Hedef:** Case status geçişleri için domain rule — invalid geçiş `InvalidCaseTransitionException` fırlatır, 409 döner.

#### Adımlar

1. **Test yaz** (`CaseStateMachineTests.cs`):
   - `Draft → UnderControl` sadece owner atanmışsa OK, aksi halde exception.
   - `UnderControl → PricingMatched` sadece tüm line'lar `Ready` ise OK.
   - `UnderControl → Draft` yasak.
   - Başka kombinasyonlar yasak.

2. **Domain metodları:** `ReconciliationCase.cs` içine:
   - `void AssignOwner(int userId)` → `Status = UnderControl`.
   - `void MarkPricingMatched(IReadOnlyList<ReconciliationLine> lines)` → validasyon + `Status = PricingMatched`.
   - Invalid geçiş → `throw new InvalidCaseTransitionException(from, to)`.

3. **Controller yakalama:** `ReconciliationCasesController` InvalidCaseTransitionException → 409.

4. **Commit:** `feat(reconciliation): enforce case state machine transitions`.

---

### Task 13 — Smoke Test + CHANGELOG + Sprint 2 PR

**Süre:** 1 gün — Gün 14 öğleden sonra + Gün 15.

- **Branch:** `release/sprint-2` (epic merge branch)

#### Adımlar

1. **Tüm task branch'leri birleşir** epic branch'e (rebase + sırayla merge).
2. **Playwright E2E suite**: `client/e2e/reconciliation-sprint2.spec.ts`
   - Login → batch yükle → Batch Detay → Case'lere git → Case Detay → line düzenle → status geç → state butonu.
3. **CHANGELOG.md güncelle** — `## Sprint 2 (2026-04-19 – 2026-05-10)` bölümü + 13 task listesi.
4. **Dokümantasyon:**
   - `docs/Mutabakat_Modulu/docs/specs/04_sprint2_claude_code_prompt.md` → "DONE, bkz. PR #XX".
   - `docs/Mutabakat_Modulu/docs/specs/05_sprint3_claude_code_prompt.md` → Sprint 3 prompt taslağı.
5. **Coverage raporu:** `dotnet test /p:CollectCoverage=true /p:CoverageReportFormat=Cobertura` → %80+.
6. **PR aç:** başlık `feat(reconciliation): sprint 2 — case/line auto + ui`, body'de Definition of Done checklist + demo video linki.

---

## Risk ve Mitigasyon

| Risk | Olasılık | Mitigasyon |
|---|---|---|
| AG-Grid Community lisans kısıtı fark edilir | Düşük | Lisans dokumentasyonu (CLAUDE.md §tuzaklar) kontrol edildi; range-paste custom Sprint 3+'ta |
| Auto-creation büyük batch'te yavaş | Orta | 20K satır limiti test edildi, timeout ise Hangfire Sprint 3 fallback (plan'a yaz) |
| UnmatchedCustomer link sonrası retry mantığı karmaşık | Orta | İlk sürüm manuel "Case oluştur" butonu; otomatik re-trigger Sprint 3 |
| ReconAgent 403 test senaryolarının tamamı yazılamaz | Düşük | Cleanup PR (Task 2) zorunlu tamamlanır Sprint 2 başlamadan |
| Smoke test fixture (gerçek Excel) yok | Orta | `tests/BudgetTracker.IntegrationTests/Fixtures/reconciliation/` altında Sprint 1'deki fixture'lar genişletilir |

---

## Sprint 2 Checklist (Sprint Sonu Review)

- [ ] Task 1 — ADR-0016 merged
- [ ] Task 2 — Cleanup PR merged, 4 policy test geçti
- [ ] Task 3 — Pilot seed yüklendi, `/pricing/lookup` gerçek sonuç döner
- [ ] Task 4 — Case auto-creation testleri geçti
- [ ] Task 5 — Line pricing resolver entegre, 4 senaryo testi geçti
- [ ] Task 6 — 3 yeni audit event kayıtta
- [ ] Task 7 — Cases API + Lines API çalışıyor
- [ ] Task 8 — UnmatchedCustomers endpoint + link flow test edildi
- [ ] Task 9 — S3 Batch Detay üç tab ile çalışıyor
- [ ] Task 10 — S4 + S5 Case Listeleri çalışıyor
- [ ] Task 11 — S6 Case Detay + AG-Grid inline edit çalışıyor
- [ ] Task 12 — State machine geçişleri 409 döner
- [ ] Task 13 — E2E smoke geçer, CHANGELOG + Sprint 3 prompt hazır
- [ ] Coverage ≥ %80
- [ ] Sprint 2 PR açık, CI yeşil

---

## Sprint 3'e Devir

Sprint 2 kapanışında hazır olması gerekenler Sprint 3 için:

- `ReconciliationCase.Status = PricingMatched` olan en az 3 gerçek case (pilot ekip test verisi)
- S6 "Müşteriye Gönder" butonu iskeleti (disabled, Sprint 3'te aktifleşir)
- QuestPDF NuGet paketi `BudgetTracker.Infrastructure.csproj`'a eklenmiş (Sprint 3'te PDF üretimi kullanacak)
- SMTP config `appsettings.json`'da placeholder (Sprint 3'te gerçek değerler Railway env'den)

Sprint 3 plan dosyası Sprint 2 bitiminde yazılır: `docs/plans/2026-05-11-reconciliation-sprint3-plan.md`.
