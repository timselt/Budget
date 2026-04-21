# Sprint 2 — Claude Code Prompt

> **Durum:** Karar tablosu kilitlendi (2026-04-19). Sprint 1 PR #25 merge edildi; Hygiene (branch protection + Playwright guard + deploy.yml gating) PR #27 / #29 / #30 ile kapatıldı.
> **Yayın:** `docs/Mutabakat_Modulu/docs/specs/04_sprint2_claude_code_prompt.md` (03_ önek `parallel_prereq_orchestration` tarafından kullanıldığı için 04_ ile yayınlandı).
> **Referans:** Sprint 1 `02_sprint1_claude_code_prompt.md` + PR #25 + Faz 1 spec `01_phase1_domain_model.md`.

---

## 0. Bağlam — Sprint 1 çıktıları

Sprint 1'de tamamlandı (PR #25):

- 8 entity iskeleti + migration + RLS (3 tenant tablo aktif, child'lar FK cascade).
- Parser altyapısı: xlsx (ClosedXML) + csv (CsvHelper), TR/EN sayı+tarih tolerance, alias normalizasyonu.
- 5 REST endpoint: upload + list + detail + DELETE (Draft-only, error-recovery) + reparse stub (501).
- SPA: `/mutabakat/batches` — sidebar, tab, filtre, upload modal, i18n TR/EN.
- Audit: `ReconciliationBatchImported`.
- Test: 374 unit + 57 integration + 136 vitest. Smoke 7/7.

Sprint 2'de iskeleti aktifleştirme: **Case otomatik oluşturma + Line eşleştirme + PriceBook lookup + State machine + AG-Grid case detayı + audit-safe reparse**.

---

## 1. Sprint 2 Hedefi (1-cümle)

Parsed batch'in `SourceRow`'ları **otomatik olarak Case + Line'lara dönüştürülecek**; Line'lar PriceBook beklenen tutarla **tolerans kuralları (max(%1, 5 TL))** çerçevesinde eşleştirilecek; kullanıcı **AG-Grid case detay ekranı**nda Match/Dispute/Manual Review kararını verecek; Case **state machine** üzerinden Open → InReview → Agreed/Disputed → Settled → **Closed (terminal, re-open yasak)** akışında ilerleyecek; reparse aksiyonları **eski Case'leri silmeden yeni Case versiyonu** oluşturacak ve `parent_case_id` ile audit zinciri kuracak.

---

## 2. DoD Checklist

### 2.1 Domain

- [ ] `ReconciliationCase` entity aktif — Create, OpenReview, Agree, Dispute, Settle, Close state guard'ları.
- [ ] `ReconciliationCase.parent_case_id` FK (nullable, self-reference) — reparse veya itiraz sonrası yeni Case eski Case'e bağlanır; eski Case `Closed` kalır.
- [ ] `ReconciliationLine` entity aktif — Match, Dispute, ManualReview; tutar delta hesabı; PriceBook referansı.
- [ ] `ReconciliationDecision` append-only — her state transition kaydı (userId, timestamp, reason).
- [ ] `AccountingInstruction` iskeleti (Sprint 3'te aktif olacak, Sprint 2'de sadece FK + entity).
- [ ] `PriceBookLookup` service — flow + period + customer_id → expected amount + currency (interface + mock impl; gerçek PriceBook Sprint 3).
- [ ] `ReconciliationToleranceConfig` — global config: `tolerance_percentage = 1.0`, `tolerance_absolute_try = 5.00`. Auto-match kuralı: `delta <= max(actual * percentage/100, absolute)`. Flow-bazlı override Sprint 3 kapsamında.

### 2.2 Application / Use Case

- [ ] `BatchToCaseDistributionService` — Parsed batch → otomatik Case'lere böl (groupBy: flow + period_code + customer_id).
- [ ] `CaseAutoGeneration` — SourceRow → ReconciliationLine mapping + PriceBook lookup + initial Decision (Auto-Match / NeedsReview).
- [ ] `CaseStateMachine` — transition rules: Open → InReview (user assigns), InReview → Agreed/Disputed, Agreed/Disputed → Settled, hepsi → Closed (terminal, **re-open yasak**). Closed Case için yeni transition isteği → 409 Conflict.
- [ ] `ReparseService` — mevcut Case'leri silmez; eski Case `Closed` (override edilmez), yeni Case `parent_case_id` ile bağlı. Mevcut decision'lar audit zincirinde korunur.
- [ ] `CaseReopenViaParentService` — itiraz akışı: yeni Case oluştur, `parent_case_id = closedCaseId`, `reopen_reason` Decision'a yazılır.
- [ ] Audit event'leri: `ReconciliationCaseGenerated`, `ReconciliationLineMatched`, `ReconciliationDecisionRecorded`, `ReconciliationCaseStateChanged`, **`ReconciliationBatchReparsed`** (yeni — payload: batchId, oldCaseIds[], newCaseIds[], userId, reason).

### 2.3 API

- [ ] `POST /api/v1/reconciliation/batches/{id}/parse` — **501'den aktif** (reparse + yeniden case distribution; eski Case'ler Closed + parent zinciri).
- [ ] `POST /api/v1/reconciliation/batches/{id}/archive` — **yeni** (Senaryo 6 follow-up: Parsed batch archive path).
- [ ] `GET /api/v1/reconciliation/cases` — filtre (flow, period, customer, state, assignedTo, **hasParent**).
- [ ] `GET /api/v1/reconciliation/cases/{id}` — detay + embedded lines + decisions + **parent zinciri** (recursive 3 seviye limit).
- [ ] `POST /api/v1/reconciliation/cases/{id}/transition` — state machine eylemi (action: assign, agree, dispute, settle, close). Closed Case → 409.
- [ ] `POST /api/v1/reconciliation/cases/{id}/reopen` — **yeni** — yeni Case yaratır, parent_case_id bağlar, eski Case Closed kalır.
- [ ] `POST /api/v1/reconciliation/lines/{id}/decision` — line bazlı Match/Dispute/ManualReview karar kaydı.

### 2.4 SPA / Client

- [ ] `/mutabakat/cases` sayfası — liste (filtre + state badge + assignee + **parent ikon** "v2/v3").
- [ ] `/mutabakat/cases/{id}` detay — **AG-Grid Community** line tablosu (pin columns, inline decision, bulk action). Enterprise lisans Sprint 3'te yeniden değerlendirilecek.
- [ ] State machine UI — transition butonları, guard feedback, **Closed Case için "Yeni Case ile İtiraz Aç" butonu** (re-open yerine).
- [ ] Batch detay ekranında "Generated Cases" linki + reparse sonrası "v2 Cases (3)" rozeti.
- [ ] Parent zinciri görünümü — Case detayında "Önceki Versiyon: #1234" linki.
- [ ] i18n TR + EN mirror.

### 2.5 Test

- [ ] Unit: BatchToCaseDistribution, CaseStateMachine (özellikle Closed → 409), LineMatching (PriceBook mock + tolerance kuralı `max(%1, 5 TL)`), ReparseService (parent zinciri), CaseReopenViaParentService.
- [ ] Integration: upload → parse → auto-case → assign → agree → settle → close akışı; **reparse senaryosu** (eski Case Closed, yeni Case parent_case_id ile bağlı, decision'lar korunmuş).
- [ ] Vitest: AG-Grid inline decision, state machine button visibility, Closed Case'te "İtiraz Aç" butonu.
- [ ] **E2E smoke (`reconciliation-upload.spec.ts`)** — Sprint 1 Known Follow-up §1; upload → parse → case listesine yansıma; Playwright guard'ı `ci.yml`'den kaldır (E2E test user provisioning sonrası — bkz. Hygiene PR #27).

### 2.6 Ops / Infra

- [ ] Reparse endpoint **idempotent değil** — her çağrı yeni Case versiyonu oluşturur (kararlı tasarım, audit zinciri). Aynı batch için 5x reparse → 5x v2/v3/.../v6 case seti. UI bu davranışı görsel olarak gösterir ("Bu batch 3 kez reparse edildi").
- [ ] `ReconciliationToleranceConfig` migration — global config tablosu, tek satır seed (percentage=1.0, absolute_try=5.00). Sprint 3'te flow-bazlı satırlar eklenebilir.
- [ ] PriceBook mock seed migration (integration test için).

---

## 3. Domain + Kod Yol Haritası

- `src/BudgetTracker.Core/Entities/Reconciliation/ReconciliationCase.cs` — sealed, TenantEntity, state machine, `ParentCaseId` nullable FK.
- `src/BudgetTracker.Core/Entities/Reconciliation/ReconciliationToleranceConfig.cs` — singleton config entity.
- `src/BudgetTracker.Application/Reconciliation/Cases/` — BatchToCaseDistributionService, CaseStateMachine, LineMatchingService, ReparseService, CaseReopenViaParentService.
- `src/BudgetTracker.Application/Reconciliation/PriceBook/` — IPriceBookLookup + MockPriceBookLookup (Sprint 3'te gerçek impl).
- `src/BudgetTracker.Application/Reconciliation/Tolerance/` — ToleranceEvaluator (`max(percentage, absolute)` rule).
- `src/BudgetTracker.Api/Controllers/Reconciliation/CasesController.cs`.
- `client/src/features/reconciliation/cases/` — CaseListPage, CaseDetailPage, AGGridLineTable (Community), StateMachineActions, ParentChainBreadcrumb.

---

## 4. API Contract (örnek)

```
POST /api/v1/reconciliation/cases/{id}/transition
Body: { action: "agree" | "dispute" | "settle" | "close" | "assign", userId?, reason? }
Response 200: { caseId, newState, transitionedAt, recordedByUserId }
Response 409: { error: "InvalidTransition" | "ClosedCaseImmutable", from, to, allowed: [...] }
```

```
POST /api/v1/reconciliation/cases/{id}/reopen
Body: { reason: string (required, min 10 char) }
Response 201: { newCaseId, parentCaseId, createdAt, decisionsInheritedCount }
Response 409: { error: "OnlyClosedCasesCanBeReopened" }
```

```
POST /api/v1/reconciliation/lines/{id}/decision
Body: { decision: "match" | "dispute" | "manual_review", reason?, overrideAmount? }
Response 200: { lineId, decision, expectedAmount, actualAmount, delta, toleranceApplied: { rule: "max(1%, 5TL)", allowedDelta }, decidedByUserId }
```

```
POST /api/v1/reconciliation/batches/{id}/parse
Body: { reparse: true, reason?: string }
Response 200: { batchId, oldCaseIds: [...], newCaseIds: [...], parentChainCreated: true, decisionsInherited: 47 }
Audit: ReconciliationBatchReparsed event yayılır.
```

---

## 5. KVKK / Audit / İSO 27001 notları

- Case + Line + Decision + ToleranceConfig hepsi tenant tablo — RLS aktif olacak (Sprint 1 pattern).
- `ReconciliationDecision` append-only (update/delete yasak; correction = yeni decision row).
- **Closed Case immutable** — re-open yasak; itiraz = yeni Case + parent_case_id (audit altın kuralı).
- Audit event'leri `audit_log` tablosuna 7 yıl retention; reparse zinciri tam izlenebilir.
- PII: Sprint 1 ile aynı — `insured_party_name` Case'e de taşınacak; Reconciliation.ViewReports policy.

---

## 6. Known Out-of-Scope (Sprint 3-4)

- PriceBook'un gerçek implementasyonu (Sprint 3).
- **Flow-bazlı tolerance override** (örn. Hayat sigortası için %0.5, Kasko için %2) — Sprint 3.
- **AG-Grid Enterprise lisans değerlendirmesi** — Sprint 3'te performans ölçümü sonrası karar (~₺100K/yıl, 3 dev seat).
- AccountingInstruction aktivasyonu + ERP entegrasyonu (Sprint 3).
- Müşteri onay akışı + şifreli PDF (Sprint 3).
- Çok sayfalı xlsx banner/uyarı (Sprint 3).
- Disk storage + 7 gün TTL purge job (Sprint 4, ihtiyaç olursa).

---

## 7. Kararlar (Sprint 2 öncesi kilitlendi — 2026-04-19)

| # | Konu | Karar | Sebep | Uygulama |
|---|---|---|---|---|
| 1 | Reparse idempotency | **Yeni Case versiyonu yarat, eski Case Closed + parent_case_id ile bağlı** | Audit zinciri korunur, kararlar kaybolmaz, "neden değişti" izlenebilir | `ReparseService` + `parent_case_id` FK + `ReconciliationBatchReparsed` event |
| 2 | Reparse'ta customer gruplaması farklıysa | **Eski Case'ler Closed kalır, yeni gruplamayla yeni Case set'i oluşur, hepsi parent zincirine bağlanır** | Veri tutarlılığı; eski state korunur, yeni durum açık | `BatchToCaseDistributionService` reparse modunda parent zincirini set eder |
| 3 | Closed Case re-open | **Hayır, asla re-open. İtiraz = yeni Case + parent_case_id** | Closed = mali kayıt; immutable olmalı (KVKK + audit altın kuralı) | `POST /cases/{id}/reopen` yeni Case yaratır; transition endpoint Closed'da 409 döner |
| 4 | Line tolerance kuralı | **Hem oran (%1) hem mutlak (5 TL); `max(percentage, absolute)`** | Küçük tutarlarda %1 anlamsız (50 kuruş), büyük tutarlarda 5 TL anlamsız (5M TL); ikisinin maks'ı esnek ve mantıklı | `ToleranceEvaluator` + `ReconciliationToleranceConfig` global tek satır |
| 5 | AG-Grid lisans | **Community (Sprint 2)** | ₺100K/yıl maliyet henüz doğrulanmamış ihtiyaç; Sprint 2 hız önceliği | `client/.../AGGridLineTable.tsx` Community import; Enterprise eval Sprint 3 |

**Follow-up:** Tolerance config Sprint 2'de **global tek satır**; Sprint 3'te flow-bazlı satır override (örn. Sağlık için %0.5) kapısı `ReconciliationToleranceConfig.flow_id` nullable kolonu ile şimdiden açık tutuldu.

---

## 8. Referans

- Sprint 1 PR #25 (merged) — ana entity + parser iskeleti.
- Faz 1 spec `01_phase1_domain_model.md` §7-9 — Case + Line + Decision + State machine tanımı.
- Known Follow-ups (PR #25 body) — reparse aktivasyon, archive endpoint, E2E smoke, AG-Grid.
- Hygiene zinciri (kapatıldı): branch protection + required checks (Backend/Client/Security) + no-bypass; Playwright guard (PR #27); deploy.yml workflow_dispatch + target gating (PR #29 / #30); CODEOWNERS (PR #27 ile).
- Customer Import PR #26 (merged, post-incident) + Hotfix PR #27 (merged) — bypass-merge incident öğrenimi: branch protection eksikliğinin kanıtı.
