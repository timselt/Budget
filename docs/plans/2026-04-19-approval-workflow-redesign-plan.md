# Onay Akışı Yeniden Tasarımı — Implementation Plan

- **Tarih:** 2026-04-19
- **Referans:** [`2026-04-19-approval-workflow-redesign-design.md`](2026-04-19-approval-workflow-redesign-design.md)
- **Branch:** `main` (uncommitted çalışmalar commit'lenecek)
- **Durum:** Onaya hazır — kod henüz yazılmadı

## Goal

Mevcut 5-aşamalı onay akışını **2-aşamalı (Finans + CFO)** akışa dönüştürmek, müşteri-bazında ilerleme göstergesi eklemek, versiyon çokluğunu **revizyon zinciri** ile sınırlamak ve terminolojiyi tutarlı hale getirmek.

## Architecture

`BudgetVersionStatus` enum 8 değerden **6 değere** düşer (`Draft`, `PendingFinance`, `PendingCfo`, `Active`, `Rejected`, `Archived`). `BudgetVersion` domain entity'si yeni state machine ile yeniden yazılır; TDD'nin her transition için test sağlar. API katmanında eski `/approve/dept`, `/approve/cfo`, `/activate` endpoint'leri kalkar; yerine `/approve-finance`, `/approve-cfo-activate`, `/create-revision` gelir. EF migration eski enum değerlerini yeni değerlere mapler, **partial unique index** ile yıl başına tek `Active` + tek "çalışılan taslak" invariant'ını DB seviyesinde zorlar. Frontend yeni etiket/chip sözlükleriyle Turkish "Taslak / Finans Onayında / CFO Onayında / Yürürlükte / Reddedildi / Arşiv" setine geçer; `BudgetEntryPage` üst banner'ı müşteri tamamlandı sayısını gösterir ve eksik müşteri varken "Onaya Gönder" kilitli kalır.

## Tech Stack

- **Backend:** .NET 10 · EF Core 10 · PostgreSQL 16 · xUnit + FluentAssertions + Testcontainers
- **Frontend:** React 19 · TypeScript · Vite · TanStack Query · Tailwind 4
- **Migrations:** `dotnet ef migrations` + raw SQL (partial index + data mapping)
- **E2E:** Playwright (mevcut dev fixture + admin login)

---

## Approval Gate

**Bu plan onaylanmadan kod yazılmayacak.** Onay sonrası her bölüm için subagent/sequential execution modu seçilecek.

### Risk & Uyarılar

- **Breaking change:** 8 eski enum değerinden 4'ü kalkacak (`Submitted`, `DeptApproved`, `FinanceApproved`, `CfoApproved`). Controller'lar, servisler, seed data, test fixture'ları hepsi güncellenecek.
- **DB downtime yok, ama rollback zor:** EF migration'ı Down() sağlam yazılacak ama dev ortamında tersi test edilecek.
- **Frontend + Backend eş zamanlı deploy gerekli:** Eski frontend yeni API'ye `DeptApproved` yollayamaz; yeni frontend eski API'yi çağıramaz. Dev branch'te iki taraf da aynı commit'te güncellenmeli.
- **E2E fixture'da admin kullanıcı var** (`admin@tag.local` / `Devpass!2026`) — çoklu rol senaryoları için sadece admin login'i kullanacağız (Admin zaten `FinanceManager` + `Cfo` policy'lerini geçer).

### Değişecek dosyaların ön sayımı

**Backend** (yaklaşık 10 dosya):
- `src/BudgetTracker.Core/Enums/BudgetVersionStatus.cs`
- `src/BudgetTracker.Core/Entities/BudgetVersion.cs`
- `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs`
- `src/BudgetTracker.Infrastructure/Persistence/Migrations/2026XXXX_ApprovalWorkflowV2.cs` (yeni)
- `src/BudgetTracker.Infrastructure/Persistence/Configurations/BudgetVersionConfiguration.cs`
- `tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs`
- `tests/BudgetTracker.IntegrationTests/Persistence/MigrationTests.cs` (gerekirse)

**Frontend** (yaklaşık 7 dosya):
- `client/src/components/budget-planning/types.ts`
- `client/src/components/budget-planning/api.ts`
- `client/src/components/budget-planning/BudgetCustomerGrid.tsx`
- `client/src/pages/BudgetEntryPage.tsx`
- `client/src/pages/ApprovalsPage.tsx`
- `client/src/pages/BudgetPeriodsPage.tsx`

---

# SECTION 1 — Backend State Machine (TDD)

**Bölüm amacı:** `BudgetVersion` entity'si yeni 6-durum state machine'e geçirilir. Her transition önce failing test ile kapsanır, sonra minimum kod yazılır.

## Task 1.1 — Enum'u yeni değerlere güncelle

**Files:**
- Modify: `src/BudgetTracker.Core/Enums/BudgetVersionStatus.cs`

**Steps:**

1. Mevcut enum'u aç:
   ```
   src/BudgetTracker.Core/Enums/BudgetVersionStatus.cs
   ```

2. Tüm içeriği aşağıdakiyle değiştir:
   ```csharp
   namespace BudgetTracker.Core.Enums;

   // ADR-0015: onay akışı 2 aşamaya indirildi. Eski Submitted, DeptApproved,
   // FinanceApproved, CfoApproved değerleri kaldırıldı; migration eski verileri
   // yeni enum değerlerine eşler.
   public enum BudgetVersionStatus
   {
       Draft = 0,
       PendingFinance = 1,
       PendingCfo = 2,
       Active = 3,
       Rejected = 4,
       Archived = 5,
   }
   ```

3. Yapmayın: `BudgetVersion.cs` bu commit'te değişmez — build'in bu task sonunda kırılması beklenir (aşağıdaki task'ta düzeltilir).

4. Commit:
   ```bash
   git add src/BudgetTracker.Core/Enums/BudgetVersionStatus.cs
   git commit -m "refactor(domain): BudgetVersionStatus enum'unu 6 değere indir

   2 aşamalı onay akışı için eski Submitted/DeptApproved/FinanceApproved/
   CfoApproved değerleri kaldırıldı. Bu commit build'i geçici olarak
   kırar; sonraki commit domain metotlarını yeni enum ile yeniden yazar.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

**Verify:** Build bilinçli olarak kırılır. `dotnet build` hata verir — OK, sonraki task düzeltir.

---

## Task 1.2 — RED: Submit_FromDraft testini yaz

**Files:**
- Modify: `tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs`

**Steps:**

1. Dosyayı aç ve **tüm içeriği** aşağıdakiyle değiştir:

   ```csharp
   using BudgetTracker.Core.Entities;
   using BudgetTracker.Core.Enums;
   using FluentAssertions;

   namespace BudgetTracker.UnitTests.Core.Entities;

   public sealed class BudgetVersionStateMachineTests
   {
       private static BudgetVersion NewDraft() =>
           BudgetVersion.CreateDraft(
               companyId: 1,
               budgetYearId: 1,
               name: "2026 Bütçe v1",
               createdByUserId: 42);

       [Fact]
       public void CreateDraft_StartsInDraftStatus()
       {
           var version = NewDraft();

           version.Status.Should().Be(BudgetVersionStatus.Draft);
           version.IsActive.Should().BeFalse();
       }

       [Fact]
       public void Submit_FromDraft_GoesToPendingFinance()
       {
           var version = NewDraft();

           version.Submit(actorUserId: 42);

           version.Status.Should().Be(BudgetVersionStatus.PendingFinance);
           version.SubmittedByUserId.Should().Be(42);
       }
   }
   ```

2. Çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** Build hatası (domain `Submitted` kullanıyor hâlâ). **Bu beklenen** — RED fazı.

**Do not commit yet.**

---

## Task 1.3 — GREEN: Entity'yi minimum düzeyde yeniden yaz

**Files:**
- Modify: `src/BudgetTracker.Core/Entities/BudgetVersion.cs`

**Steps:**

1. Mevcut dosyanın tüm içeriğini aşağıdakiyle değiştir:

   ```csharp
   using BudgetTracker.Core.Common;
   using BudgetTracker.Core.Enums;

   namespace BudgetTracker.Core.Entities;

   public sealed class BudgetVersion : TenantEntity
   {
       public int BudgetYearId { get; private set; }
       public string Name { get; private set; } = default!;
       public BudgetVersionStatus Status { get; private set; }
       public bool IsActive { get; private set; }
       public string? RejectionReason { get; private set; }

       public DateTimeOffset? SubmittedAt { get; private set; }
       public int? SubmittedByUserId { get; private set; }
       public DateTimeOffset? FinanceApprovedAt { get; private set; }
       public int? FinanceApprovedByUserId { get; private set; }
       public DateTimeOffset? CfoApprovedAt { get; private set; }
       public int? CfoApprovedByUserId { get; private set; }
       public DateTimeOffset? ActivatedAt { get; private set; }
       public int? ActivatedByUserId { get; private set; }

       private BudgetVersion() { }

       public static BudgetVersion CreateDraft(int companyId, int budgetYearId, string name, int createdByUserId)
       {
           if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
           if (budgetYearId <= 0) throw new ArgumentOutOfRangeException(nameof(budgetYearId));
           ArgumentException.ThrowIfNullOrWhiteSpace(name);

           var version = new BudgetVersion
           {
               BudgetYearId = budgetYearId,
               Name = name,
               Status = BudgetVersionStatus.Draft,
               IsActive = false,
               CreatedAt = DateTimeOffset.UtcNow,
               CreatedByUserId = createdByUserId
           };
           version.CompanyId = companyId;
           return version;
       }

       public void Submit(int actorUserId)
       {
           if (Status is not (BudgetVersionStatus.Draft or BudgetVersionStatus.Rejected))
           {
               throw new InvalidOperationException(
                   $"{nameof(Submit)} requires status Draft or Rejected, current is {Status}");
           }

           Status = BudgetVersionStatus.PendingFinance;
           SubmittedAt = DateTimeOffset.UtcNow;
           SubmittedByUserId = actorUserId;
           RejectionReason = null;
       }

       /// <summary>Test helper: state machine'i test ederken doğrudan status set etmek için. Production kodunda kullanılmaz.</summary>
       internal void ForceStatus(BudgetVersionStatus status) => Status = status;
   }
   ```

2. Test çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** 2 test geçer (CreateDraft + Submit_FromDraft). Diğer downstream derleme hataları kalabilir (Controller, Services) — sonraki task'larda.

3. Commit:
   ```bash
   git add src/BudgetTracker.Core/Entities/BudgetVersion.cs tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs
   git commit -m "refactor(domain)!: BudgetVersion yeni 6-durum state machine (Submit)

   İlk adım: Draft|Rejected → PendingFinance geçişi. Eski DeptApproved
   metodu ve ilgili kolonlar temizlendi. Downstream (Controller/Services)
   hâlâ build'i kırıyor; sonraki commit'lerde düzeltilecek.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 1.4 — RED: ApproveByFinance testi ekle

**Files:**
- Modify: `tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs`

**Steps:**

1. Class'ın sonuna (closing `}`'dan önce) şu test'leri ekle:

   ```csharp
   [Fact]
   public void ApproveByFinance_FromPendingFinance_GoesToPendingCfo()
   {
       var version = NewDraft();
       version.Submit(42);

       version.ApproveByFinance(actorUserId: 43);

       version.Status.Should().Be(BudgetVersionStatus.PendingCfo);
       version.FinanceApprovedByUserId.Should().Be(43);
   }

   [Theory]
   [InlineData(BudgetVersionStatus.Draft)]
   [InlineData(BudgetVersionStatus.PendingCfo)]
   [InlineData(BudgetVersionStatus.Active)]
   [InlineData(BudgetVersionStatus.Rejected)]
   [InlineData(BudgetVersionStatus.Archived)]
   public void ApproveByFinance_FromNonPendingFinance_Throws(BudgetVersionStatus from)
   {
       var version = NewDraft();
       version.ForceStatus(from);

       var act = () => version.ApproveByFinance(actorUserId: 43);

       act.Should().Throw<InvalidOperationException>();
   }
   ```

2. Test çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** Build hatası — `ApproveByFinance` henüz yok. RED doğrulandı.

**Do not commit yet.**

---

## Task 1.5 — GREEN: ApproveByFinance metodu ekle

**Files:**
- Modify: `src/BudgetTracker.Core/Entities/BudgetVersion.cs`

**Steps:**

1. `Submit` metodundan sonra şu metodu ekle:

   ```csharp
   public void ApproveByFinance(int actorUserId)
   {
       EnsureStatus(BudgetVersionStatus.PendingFinance, nameof(ApproveByFinance));
       Status = BudgetVersionStatus.PendingCfo;
       FinanceApprovedAt = DateTimeOffset.UtcNow;
       FinanceApprovedByUserId = actorUserId;
   }

   private void EnsureStatus(BudgetVersionStatus expected, string action)
   {
       if (Status != expected)
       {
           throw new InvalidOperationException(
               $"{action} requires status {expected}, current is {Status}");
       }
   }
   ```

2. Test çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** 4 test geçer (önceki 2 + yeni 2 paket: 1 fact + 5 theory).

3. Commit:
   ```bash
   git add src/BudgetTracker.Core/Entities/BudgetVersion.cs tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs
   git commit -m "refactor(domain): ApproveByFinance transition + testler

   PendingFinance → PendingCfo geçişi. Mevcut Draft/Active/Rejected/Archived
   durumlarından bu metoda çağrı InvalidOperationException atar.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 1.6 — RED: ApproveByCfoAndActivate testleri ekle

**Files:**
- Modify: `tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs`

**Steps:**

1. Aşağıdaki test'leri ekle (class sonunda):

   ```csharp
   [Fact]
   public void ApproveByCfoAndActivate_FromPendingCfo_NoExistingActive_MarksActive()
   {
       var version = NewDraft();
       version.Submit(42);
       version.ApproveByFinance(43);

       version.ApproveByCfoAndActivate(actorUserId: 44, currentActive: null);

       version.Status.Should().Be(BudgetVersionStatus.Active);
       version.IsActive.Should().BeTrue();
       version.ActivatedByUserId.Should().Be(44);
       version.CfoApprovedByUserId.Should().Be(44);
   }

   [Fact]
   public void ApproveByCfoAndActivate_WithExistingActive_ArchivesOld()
   {
       var oldActive = NewDraft();
       oldActive.ForceStatus(BudgetVersionStatus.Active);
       typeof(BudgetVersion).GetProperty(nameof(BudgetVersion.IsActive))!
           .SetValue(oldActive, true); // reflection: test helper — prod kod kullanmaz

       var newVersion = NewDraft();
       newVersion.Submit(42);
       newVersion.ApproveByFinance(43);

       newVersion.ApproveByCfoAndActivate(actorUserId: 44, currentActive: oldActive);

       newVersion.Status.Should().Be(BudgetVersionStatus.Active);
       newVersion.IsActive.Should().BeTrue();
       oldActive.Status.Should().Be(BudgetVersionStatus.Archived);
       oldActive.IsActive.Should().BeFalse();
   }

   [Theory]
   [InlineData(BudgetVersionStatus.Draft)]
   [InlineData(BudgetVersionStatus.PendingFinance)]
   [InlineData(BudgetVersionStatus.Active)]
   [InlineData(BudgetVersionStatus.Rejected)]
   [InlineData(BudgetVersionStatus.Archived)]
   public void ApproveByCfoAndActivate_FromNonPendingCfo_Throws(BudgetVersionStatus from)
   {
       var version = NewDraft();
       version.ForceStatus(from);

       var act = () => version.ApproveByCfoAndActivate(44, currentActive: null);

       act.Should().Throw<InvalidOperationException>();
   }
   ```

2. Test çalıştır → build hatası (metot yok). RED doğrulandı.

**Do not commit yet.**

**Not:** `IsActive` private set olduğu için test'te reflection ile set edildi; bu kabul edilebilir çünkü sadece test fixture kurma amaçlı. Entity'nin `Activate` aksiyonu dışında `IsActive`'i değiştirmiyoruz.

---

## Task 1.7 — GREEN: ApproveByCfoAndActivate metodu ekle

**Files:**
- Modify: `src/BudgetTracker.Core/Entities/BudgetVersion.cs`

**Steps:**

1. `ApproveByFinance` metodundan sonra ekle:

   ```csharp
   public void ApproveByCfoAndActivate(int actorUserId, BudgetVersion? currentActive)
   {
       EnsureStatus(BudgetVersionStatus.PendingCfo, nameof(ApproveByCfoAndActivate));

       var now = DateTimeOffset.UtcNow;
       CfoApprovedAt = now;
       CfoApprovedByUserId = actorUserId;

       Status = BudgetVersionStatus.Active;
       IsActive = true;
       ActivatedAt = now;
       ActivatedByUserId = actorUserId;

       if (currentActive is not null)
       {
           if (ReferenceEquals(currentActive, this))
           {
               throw new InvalidOperationException(
                   "currentActive cannot be the same instance as the version being activated");
           }
           currentActive.Status = BudgetVersionStatus.Archived;
           currentActive.IsActive = false;
           currentActive.UpdatedAt = now;
           currentActive.UpdatedByUserId = actorUserId;
       }
   }
   ```

2. Test çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** 7 test geçer.

3. Commit:
   ```bash
   git add src/BudgetTracker.Core/Entities/BudgetVersion.cs tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs
   git commit -m "refactor(domain): ApproveByCfoAndActivate atomic geçiş + testler

   CFO onayı + aktifleştirme tek aksiyonda. Eski active versiyon varsa aynı
   call içinde Archived'a çekilir. Çağrı tarafı (Controller) varsa eski
   versiyonu aynı transaction'da gönderir; yoksa null geçer.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 1.8 — Reject, Archive metotları + testler (tek commit)

**Files:**
- Modify: `src/BudgetTracker.Core/Entities/BudgetVersion.cs`
- Modify: `tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs`

**Steps:**

1. Test dosyasına ekle:

   ```csharp
   [Fact]
   public void Reject_FromPendingFinance_GoesToRejectedWithReason()
   {
       var version = NewDraft();
       version.Submit(42);

       version.Reject(actorUserId: 43, reason: "Eksik hasar planı");

       version.Status.Should().Be(BudgetVersionStatus.Rejected);
       version.RejectionReason.Should().Be("Eksik hasar planı");
   }

   [Fact]
   public void Reject_FromPendingCfo_GoesToRejected()
   {
       var version = NewDraft();
       version.Submit(42);
       version.ApproveByFinance(43);

       version.Reject(actorUserId: 44, reason: "CFO düzeltme istedi");

       version.Status.Should().Be(BudgetVersionStatus.Rejected);
   }

   [Theory]
   [InlineData(BudgetVersionStatus.Draft)]
   [InlineData(BudgetVersionStatus.Active)]
   [InlineData(BudgetVersionStatus.Archived)]
   [InlineData(BudgetVersionStatus.Rejected)]
   public void Reject_FromInvalidStatus_Throws(BudgetVersionStatus from)
   {
       var version = NewDraft();
       version.ForceStatus(from);

       var act = () => version.Reject(42, "reason");

       act.Should().Throw<InvalidOperationException>();
   }

   [Theory]
   [InlineData("")]
   [InlineData("   ")]
   public void Reject_WithoutReason_Throws(string badReason)
   {
       var version = NewDraft();
       version.Submit(42);

       var act = () => version.Reject(43, badReason);

       act.Should().Throw<ArgumentException>();
   }

   [Fact]
   public void Submit_FromRejected_ResubmitsAndClearsRejectionReason()
   {
       var version = NewDraft();
       version.Submit(42);
       version.Reject(43, "Eksik hasar planı");

       version.Submit(actorUserId: 42);

       version.Status.Should().Be(BudgetVersionStatus.PendingFinance);
       version.RejectionReason.Should().BeNull();
   }

   [Fact]
   public void Archive_FromActive_GoesToArchived()
   {
       var version = NewDraft();
       version.Submit(42);
       version.ApproveByFinance(43);
       version.ApproveByCfoAndActivate(44, currentActive: null);

       version.Archive(actorUserId: 45);

       version.Status.Should().Be(BudgetVersionStatus.Archived);
       version.IsActive.Should().BeFalse();
   }

   [Theory]
   [InlineData(BudgetVersionStatus.Draft)]
   [InlineData(BudgetVersionStatus.PendingFinance)]
   [InlineData(BudgetVersionStatus.PendingCfo)]
   [InlineData(BudgetVersionStatus.Rejected)]
   [InlineData(BudgetVersionStatus.Archived)]
   public void Archive_FromNonActive_Throws(BudgetVersionStatus from)
   {
       var version = NewDraft();
       version.ForceStatus(from);

       var act = () => version.Archive(42);

       act.Should().Throw<InvalidOperationException>();
   }
   ```

2. Entity'ye ekle (`EnsureStatus`'dan önce):

   ```csharp
   public void Reject(int actorUserId, string reason)
   {
       if (Status is not (BudgetVersionStatus.PendingFinance or BudgetVersionStatus.PendingCfo))
       {
           throw new InvalidOperationException(
               $"{nameof(Reject)} requires status PendingFinance or PendingCfo, current is {Status}");
       }
       ArgumentException.ThrowIfNullOrWhiteSpace(reason);

       Status = BudgetVersionStatus.Rejected;
       RejectionReason = reason;
       UpdatedAt = DateTimeOffset.UtcNow;
       UpdatedByUserId = actorUserId;
   }

   public void Archive(int actorUserId)
   {
       EnsureStatus(BudgetVersionStatus.Active, nameof(Archive));
       Status = BudgetVersionStatus.Archived;
       IsActive = false;
       UpdatedAt = DateTimeOffset.UtcNow;
       UpdatedByUserId = actorUserId;
   }
   ```

3. Test çalıştır:
   ```bash
   dotnet test tests/BudgetTracker.UnitTests/BudgetTracker.UnitTests.csproj \
     --filter "FullyQualifiedName~BudgetVersionStateMachineTests" --nologo
   ```

**Expected:** ≥13 test geçer (14 fact + 11 theory-inline = 25 senaryo, TestCount bu civarda).

4. Commit:
   ```bash
   git add src/BudgetTracker.Core/Entities/BudgetVersion.cs tests/BudgetTracker.UnitTests/Core/Entities/BudgetVersionStateMachineTests.cs
   git commit -m "refactor(domain): Reject + Archive metotları + testler

   Reject: PendingFinance|PendingCfo → Rejected, sebep zorunlu.
   Archive: Active → Archived.
   Resubmit senaryosu (Rejected → Submit → PendingFinance + RejectionReason
   temizlenir) eklendi.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 2 — Controller Endpoint Refactor

**Bölüm amacı:** API yüzeyinde eski endpoint'leri kaldırıp yeni 2-aşamalı endpoint'leri eklemek, authorization policy'lerini güncellemek.

## Task 2.1 — Controller'ı yeniden yaz

**Files:**
- Modify: `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs`

**Steps:**

1. Aşağıdaki endpoint'leri **TAMAMEN KALDIR**:
   - `POST /approve/dept` (line ~120)
   - `POST /approve/finance` eski davranış (line ~132; **yeniden yazılacak**)
   - `POST /approve/cfo` (line ~144)
   - `POST /activate` (line ~156)

2. Yeni endpoint'leri ekle (eski konumlarına):

   ```csharp
   [HttpPost("versions/{versionId:int}/approve-finance")]
   [Authorize(Policy = "FinanceManager")]
   public async Task<IActionResult> ApproveFinance(int versionId, CancellationToken cancellationToken)
   {
       var version = await FindVersionAsync(versionId, cancellationToken);
       if (version is null) return NotFound();

       try
       {
           version.ApproveByFinance(GetUserId());
       }
       catch (InvalidOperationException ex)
       {
           return BadRequest(new { error = ex.Message });
       }

       await _db.SaveChangesAsync(cancellationToken);
       return Ok(ToDto(version));
   }

   [HttpPost("versions/{versionId:int}/approve-cfo-activate")]
   [Authorize(Policy = "Cfo")]
   public async Task<IActionResult> ApproveCfoAndActivate(int versionId, CancellationToken cancellationToken)
   {
       var version = await FindVersionAsync(versionId, cancellationToken);
       if (version is null) return NotFound();

       // Aynı yıldaki mevcut Active versiyonu aynı transaction'da Archived'a çek.
       var currentActive = await _db.BudgetVersions
           .FirstOrDefaultAsync(
               v => v.BudgetYearId == version.BudgetYearId
                    && v.Status == BudgetVersionStatus.Active
                    && v.Id != version.Id,
               cancellationToken);

       try
       {
           version.ApproveByCfoAndActivate(GetUserId(), currentActive);
       }
       catch (InvalidOperationException ex)
       {
           return BadRequest(new { error = ex.Message });
       }

       await _db.SaveChangesAsync(cancellationToken);
       return Ok(ToDto(version));
   }

   [HttpPost("versions/{versionId:int}/create-revision")]
   [Authorize(Policy = "RequireFinanceRole")]
   public async Task<IActionResult> CreateRevision(int versionId, CancellationToken cancellationToken)
   {
       var source = await FindVersionAsync(versionId, cancellationToken);
       if (source is null) return NotFound();

       if (source.Status != BudgetVersionStatus.Active)
           return BadRequest(new { error = "Only Active versions can be revised" });

       // Yeni taslak hâli: "{Yıl} V{n+1} Taslak"
       var siblingCount = await _db.BudgetVersions
           .CountAsync(v => v.BudgetYearId == source.BudgetYearId, cancellationToken);
       var year = await _db.BudgetYears
           .Where(y => y.Id == source.BudgetYearId)
           .Select(y => y.Year)
           .FirstAsync(cancellationToken);
       var newName = $"{year} V{siblingCount + 1} Taslak";

       var newVersion = BudgetVersion.CreateDraft(
           GetCompanyId(),
           source.BudgetYearId,
           newName,
           GetUserId());

       _db.BudgetVersions.Add(newVersion);
       await _db.SaveChangesAsync(cancellationToken);

       // Aktif versiyonun tüm budget_entries'ini yeni taslağa kopyala.
       var rows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
           INSERT INTO budget_entries
               (company_id, version_id, customer_id, month, entry_type,
                amount_original, currency_code, amount_try_fixed, amount_try_spot,
                contract_id, product_id, created_at, created_by_user_id)
           SELECT company_id, {newVersion.Id}, customer_id, month, entry_type,
                  amount_original, currency_code, amount_try_fixed, amount_try_spot,
                  contract_id, product_id, NOW(), {GetUserId()}
             FROM budget_entries
            WHERE version_id = {source.Id}", cancellationToken);

       return Created($"api/v1/budget/versions/{newVersion.Id}", ToDto(newVersion));
   }
   ```

3. `Submit` endpoint'i zaten var (`RequireFinanceRole`). Sadece status kontrolü güncellendiği için domain tarafı zaten doğru. Değişiklik gerekmez.

4. `Reject` endpoint'i (`RequireFinanceRole` ile). Yeni domain sadece `PendingFinance`/`PendingCfo` kabul eder. Policy mevcut yeterli.

5. `Archive` endpoint'i (`RequireFinanceRole` ile). Yeni domain sadece `Active` kabul eder.

6. **Not:** `RequireFinanceRole` policy'si zaten `FinanceManager` + `Admin` rolünü kapsıyor. Ek policy değişikliği gerekli değil.

7. Build & test:
   ```bash
   dotnet build src/BudgetTracker.Api/BudgetTracker.Api.csproj --nologo
   ```

**Expected:** Build başarılı olmalı.

8. Diğer servislerde `BudgetVersionStatus.Submitted` veya `DeptApproved` referansı kaldı mı kontrol et:
   ```bash
   grep -rn "Submitted\|DeptApproved\|FinanceApproved\|CfoApproved" src/ --include="*.cs" | grep -v bin | grep -v obj | grep "BudgetVersionStatus"
   ```

**Expected:** Hiç sonuç yok.

9. Commit:
   ```bash
   git add src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs
   git commit -m "feat(approvals)!: yeni 2-aşamalı onay endpoint'leri

   - POST /approve-finance: PendingFinance → PendingCfo
   - POST /approve-cfo-activate: PendingCfo → Active + eski Active → Archived
     (atomic single transaction)
   - POST /create-revision: Active → yeni Draft + entry kopyası
   - Eski endpoint'ler: /approve/dept, /approve/cfo, /activate kaldırıldı
   - Frontend bu değişikliğe takip eden commit'lerde uyarlanacak

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 3 — EF Migration (enum mapping + partial index)

**Bölüm amacı:** Mevcut DB'deki eski enum string değerlerini yeni değerlere map'lemek, yıl-başına tek-aktif + tek-çalışılan-taslak invariant'ını partial unique index ile zorlamak.

## Task 3.1 — Migration oluştur (empty)

**Files:**
- Create: `src/BudgetTracker.Infrastructure/Persistence/Migrations/2026XXXX_ApprovalWorkflowV2.cs`

**Steps:**

1. Entity Configuration'ı önce güncelle (bu EF model snapshot'ı yeni enum'a hizalamak için):

   `src/BudgetTracker.Infrastructure/Persistence/Configurations/BudgetVersionConfiguration.cs`

   Mevcut bu satırı SİL:
   ```csharp
   b.Property(x => x.DeptApprovedAt);
   ```

2. Migration'ı oluştur:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget
   dotnet ef migrations add ApprovalWorkflowV2 \
     --project src/BudgetTracker.Infrastructure \
     --startup-project src/BudgetTracker.Api
   ```

**Expected:** Yeni dosya: `src/BudgetTracker.Infrastructure/Persistence/Migrations/YYYYMMDDHHMMSS_ApprovalWorkflowV2.cs`

3. Oluşturulan dosyayı oku (auto-generated DROP COLUMN dept_approved_at bekleniyor).

4. **Henüz commit etme.**

---

## Task 3.2 — Migration içeriğini yeni enum mapping + partial index ile doldur

**Files:**
- Modify: `src/BudgetTracker.Infrastructure/Persistence/Migrations/YYYYMMDDHHMMSS_ApprovalWorkflowV2.cs` (önceki task'ta oluşturulan)

**Steps:**

1. Dosyayı aç; `Up()` metodunun başına (auto-generated DROP'lardan önce) aşağıdaki SQL'i ekle:

   ```csharp
   protected override void Up(MigrationBuilder migrationBuilder)
   {
       // ============================================================
       // 1) Eski enum string değerlerini yeni değerlere map'le.
       //    budget_versions.status kolonu EnumToStringConverter ile
       //    text olarak tutuluyor.
       // ============================================================
       migrationBuilder.Sql(@"
           UPDATE budget_versions
              SET status = CASE status
                             WHEN 'Submitted'        THEN 'PendingFinance'
                             WHEN 'DeptApproved'     THEN 'PendingFinance'
                             WHEN 'FinanceApproved'  THEN 'PendingCfo'
                             WHEN 'CfoApproved'      THEN 'PendingCfo'
                             ELSE status
                           END
            WHERE status IN ('Submitted','DeptApproved','FinanceApproved','CfoApproved');
       ");

       // ============================================================
       // 2) Invariant: yıl başına tek Active. Zaten EXCLUDE constraint ile
       //    zorlanıyor (InitialSchema'da eklendi). Birden fazla Active
       //    olursa cleanup — en yeni tutulur.
       // ============================================================
       migrationBuilder.Sql(@"
           WITH ranked AS (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY company_id, budget_year_id
                      ORDER BY created_at DESC, id DESC
                    ) AS rn
               FROM budget_versions
              WHERE status = 'Active'
           )
           UPDATE budget_versions
              SET status = 'Archived',
                  is_active = FALSE,
                  updated_at = NOW()
            WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
       ");

       // ============================================================
       // 3) Invariant: yıl başına tek "çalışılan taslak". Birden fazla varsa
       //    en yeni tutulur, diğerleri Archived'a çekilir.
       // ============================================================
       migrationBuilder.Sql(@"
           WITH ranked AS (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY company_id, budget_year_id
                      ORDER BY created_at DESC, id DESC
                    ) AS rn
               FROM budget_versions
              WHERE status IN ('Draft','PendingFinance','PendingCfo','Rejected')
           )
           UPDATE budget_versions
              SET status = 'Archived',
                  updated_at = NOW()
            WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
       ");

       // ============================================================
       // 4) Partial unique index: yıl başına tek "çalışılan taslak".
       //    Active invariant'ı zaten EXCLUDE USING gist ile sağlanıyor.
       // ============================================================
       migrationBuilder.Sql(@"
           CREATE UNIQUE INDEX IF NOT EXISTS ux_budget_versions_single_in_progress
               ON budget_versions (company_id, budget_year_id)
            WHERE status IN ('Draft','PendingFinance','PendingCfo','Rejected')
              AND deleted_at IS NULL;
       ");

       // Auto-generated DROP COLUMN dept_approved_at burada kalır
       // (EF bunu otomatik ekledi, dokunmaya gerek yok).
       ...
   }
   ```

2. `Down()` metoduna ters sırayı ekle:

   ```csharp
   protected override void Down(MigrationBuilder migrationBuilder)
   {
       // Partial index düş
       migrationBuilder.Sql("DROP INDEX IF EXISTS ux_budget_versions_single_in_progress;");

       // Enum string'lerini geri çevir (best-effort — orijinal bilgi kaybı olur)
       migrationBuilder.Sql(@"
           UPDATE budget_versions
              SET status = CASE status
                             WHEN 'PendingFinance' THEN 'Submitted'
                             WHEN 'PendingCfo'     THEN 'FinanceApproved'
                             ELSE status
                           END
            WHERE status IN ('PendingFinance','PendingCfo');
       ");

       // Auto-generated: ADD COLUMN dept_approved_at back
       ...
   }
   ```

3. Migration'ı dev DB'ye uygula:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget
   dotnet ef database update \
     --project src/BudgetTracker.Infrastructure \
     --startup-project src/BudgetTracker.Api
   ```

**Expected:** `Done.` çıktısı.

4. DB state kontrol:
   ```bash
   PGPASSWORD=budgettracker_dev_password psql -h localhost -p 5435 -U budgettracker -d budgettracker \
     -c "SELECT id, budget_year_id, name, status, is_active FROM budget_versions ORDER BY id;"
   ```

**Expected:**
- Yıl 2026'da bir tane `Active`
- Diğerleri `Archived` veya `PendingFinance` / `PendingCfo` / `Rejected`
- Hiçbir row'da `Submitted`/`DeptApproved`/`FinanceApproved`/`CfoApproved` yok

5. Partial index doğrula:
   ```bash
   PGPASSWORD=budgettracker_dev_password psql -h localhost -p 5435 -U budgettracker -d budgettracker \
     -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'budget_versions';"
   ```

**Expected:** `ux_budget_versions_single_in_progress` index'i listelenmeli.

6. Commit:
   ```bash
   git add src/BudgetTracker.Infrastructure/Persistence/Migrations/ \
           src/BudgetTracker.Infrastructure/Persistence/Configurations/BudgetVersionConfiguration.cs
   git commit -m "feat(db): ApprovalWorkflowV2 migration — enum mapping + partial index

   - Eski status string'leri yeni enum'a map'lendi
   - Yıl başına birden fazla Active varsa (hiç olmamalı ama defensive)
     en yeni korunur, diğerleri Archived
   - Partial unique index: yıl başına tek 'çalışılan taslak'
   - dept_approved_at kolonu düştü

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 3.3 — API yeniden başlat ve smoke test

**Files:** none (sadece runtime)

**Steps:**

1. Eski API process'i öldür ve yeniden başlat:
   ```bash
   pgrep -fl "dotnet.*BudgetTracker.Api" | head -1 | awk '{print $1}' | xargs -r kill
   cd /Users/timurselcukturan/Uygulamalar/Budget
   nohup dotnet run --project src/BudgetTracker.Api \
     --urls http://localhost:5100 > /tmp/budget-api.log 2>&1 &
   sleep 6
   ```

2. Health check:
   ```bash
   curl -s http://localhost:5100/api/v1/budget/years | head
   ```

**Expected:** 401 (Unauthorized, cookie yok) ya da array.

3. Log'da exception var mı:
   ```bash
   grep -iE "error|exception|failed" /tmp/budget-api.log | grep -v "Seq" | tail -10
   ```

**Expected:** Sadece Seq bağlantı hatası (ignorable), başka exception yok.

4. **Commit yok** (runtime only).

---

# SECTION 4 — Frontend Types & Status Sözlükleri

**Bölüm amacı:** TS tarafında yeni enum değerlerini kullanan label + chip class sözlükleri oluşturmak. `EDITABLE_STATUSES` güncellenir.

## Task 4.1 — `types.ts` ve API helper güncelle

**Files:**
- Modify: `client/src/components/budget-planning/types.ts`
- Modify: `client/src/components/budget-planning/api.ts`

**Steps:**

1. `types.ts` sonuna ekle / değiştir:

   ```typescript
   // Yeni onay akışı durumları (backend 6-değer enum).
   export type BudgetVersionStatus =
     | 'Draft'
     | 'PendingFinance'
     | 'PendingCfo'
     | 'Active'
     | 'Rejected'
     | 'Archived'

   // API status'u PascalCase serialize ediyor — ama önceki kodda .ToUpperInvariant()
   // vardı, şimdi sadeleştir: raw PascalCase değer.
   export const STATUS_LABELS: Record<BudgetVersionStatus, string> = {
     Draft: 'Taslak',
     PendingFinance: 'Finans Onayında',
     PendingCfo: 'CFO Onayında',
     Active: 'Yürürlükte',
     Rejected: 'Reddedildi',
     Archived: 'Arşiv',
   }

   export const STATUS_CHIP_CLASS: Record<BudgetVersionStatus, string> = {
     Draft: 'chip-neutral',
     PendingFinance: 'chip-warning',
     PendingCfo: 'chip-warning',
     Active: 'chip-success',
     Rejected: 'chip-error',
     Archived: 'chip-neutral',
   }

   // EDITABLE_STATUSES yeniden: sadece Draft ve Rejected
   export const EDITABLE_STATUSES = new Set<BudgetVersionStatus>(['Draft', 'Rejected'])

   export function isEditableStatus(status: string | null | undefined): boolean {
     if (!status) return false
     return EDITABLE_STATUSES.has(status as BudgetVersionStatus)
   }
   ```

   **ÖNEMLİ:** Mevcut `isEditableStatus` fonksiyonu `toUpperCase()` yapıyordu — yeni kod PascalCase eşleşmesi bekler. Backend controller'da `.ToUpperInvariant()` çağrıları bu nedenle kaldırılmalı ya da tersine frontend tüm karşılaştırmalarda aynı normalization uygulamalı.

2. Backend controller'da PascalCase'e geç:

   `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs`

   4 yerdeki `v.Status.ToString().ToUpperInvariant()` → `v.Status.ToString()` (PascalCase kalır)

3. `api.ts`'te yeni helper'ları ekle:

   ```typescript
   export async function approveFinance(versionId: number): Promise<void> {
     await api.post(`/budget/versions/${versionId}/approve-finance`)
   }

   export async function approveCfoAndActivate(versionId: number): Promise<void> {
     await api.post(`/budget/versions/${versionId}/approve-cfo-activate`)
   }

   export async function rejectVersion(versionId: number, reason: string): Promise<void> {
     await api.post(`/budget/versions/${versionId}/reject`, { reason })
   }

   export async function archiveVersion(versionId: number): Promise<void> {
     await api.post(`/budget/versions/${versionId}/archive`)
   }

   export async function createRevision(versionId: number): Promise<BudgetVersionRow> {
     const { data } = await api.post<BudgetVersionRow>(
       `/budget/versions/${versionId}/create-revision`,
     )
     return data
   }
   ```

   `createVersion` (yıl başına ilk taslak) korunur.
   `submitVersion` zaten var — davranışı zaten `Submit` = `PendingFinance`.

4. Build:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   ```

**Expected:** Başarılı (eski `ApprovalsPage` / `BudgetPeriodsPage` hâlâ `STATUS_META` veya eski string'leri kullanıyor olabilir, o task'lar bu bölümden sonra gelir — build geçici olarak hata verebilir ya da eski kod sürdürülür).

**Not:** Eğer `ApprovalsPage.tsx` veya `BudgetPeriodsPage.tsx`'teki UPPER-case string match'leri build'i kırarsa, bu task'ta geçici tolerans (backwards-compat) ekleyebiliriz — ya da **5.X / 7.X task'larında aynı commit'te düzeltmek için bu sıra korunur**. Pratikte biz `toUpperCase()` yapan yerleri PascalCase'e çevireceğiz, sonraki task'larda.

5. Commit:
   ```bash
   git add client/src/components/budget-planning/types.ts \
           client/src/components/budget-planning/api.ts \
           src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs
   git commit -m "feat(client)!: yeni onay status enum sözlükleri + API helper'ları

   - STATUS_LABELS + STATUS_CHIP_CLASS map'leri (Türkçe etiket, chip class)
   - EDITABLE_STATUSES Set<BudgetVersionStatus> tipli
   - api: approveFinance, approveCfoAndActivate, rejectVersion, createRevision
   - Controller response'u artık PascalCase status string döner
     (ToUpperInvariant kaldırıldı)

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 5 — BudgetEntryPage: Banner + Kilit

**Bölüm amacı:** Bütçe Planlama sayfasında üst banner: müşteri tamamlandı sayısı, ilerleme çubuğu, kilitli/açık "Onaya Gönder" butonu.

## Task 5.1 — Müşteri tamamlandı hesaplama

**Files:**
- Modify: `client/src/pages/BudgetEntryPage.tsx`

**Steps:**

1. Mevcut `revenueTotal / claimTotal` useMemo'sunun HEMEN ÜSTÜNE yeni useMemo:

   ```typescript
   // Müşteri başına tamamlandı hesabı: versiyonda o müşterinin en az 1
   // BudgetEntry'si varsa "tamamlandı" sayılır (design doc §4 karar A).
   const completedCustomerIds = useMemo(() => {
     const ids = new Set<number>()
     for (const e of entries) ids.add(e.customerId)
     return ids
   }, [entries])

   const totalCustomerCount = customers.length
   const completedCustomerCount = completedCustomerIds.size
   const allCustomersComplete =
     totalCustomerCount > 0 && completedCustomerCount === totalCustomerCount
   ```

2. Mevcut `submitMutation` enabled koşulunu güncelle:

   ```typescript
   const canSubmit =
     isEditable &&
     allCustomersComplete &&
     !submitMutation.isPending
   ```

3. **Header'daki "Onaya Gönder" butonunun `disabled` ve `onClick` koşulunu güncelle** (line ~362):

   ```typescript
   <button
     type="button"
     className="btn-primary"
     disabled={!canSubmit}
     title={
       !isEditable
         ? 'Bu versiyon düzenlenemez'
         : !allCustomersComplete
           ? `${totalCustomerCount - completedCustomerCount} müşteride henüz tutar girilmedi`
           : undefined
     }
     onClick={() => {
       if (!canSubmit) return
       if (!confirm('Bu versiyon onaya gönderilecek. Emin misiniz?')) return
       setSubmitError(null)
       submitMutation.mutate()
     }}
   >
     <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
       verified
     </span>
     {submitMutation.isPending
       ? 'Gönderiliyor…'
       : allCustomersComplete
         ? 'Onaya Gönder'
         : `Onaya Gönder (${totalCustomerCount - completedCustomerCount} eksik)`}
   </button>
   ```

4. Build ve hızlı göz gezdirme:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   ```

5. Commit:
   ```bash
   git add client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): müşteri tamamlandı sayısına göre Onaya Gönder kilidi

   - completedCustomerIds set'i entries üzerinden hesaplanır
   - allCustomersComplete koşulu (≥1 entry varsa müşteri tamam sayılır)
   - Buton disabled: versiyon düzenlenemez veya eksik müşteri varsa
   - Buton yazısı: 'Onaya Gönder (5 eksik)' — kullanıcıya görünür feedback

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 5.2 — Üst ilerleme banner'ı ekle

**Files:**
- Modify: `client/src/pages/BudgetEntryPage.tsx`

**Steps:**

1. Mevcut "createDraftError" koşullu banner'ının (line ~476 civarı) HEMEN ALTINA yeni banner ekle:

   ```tsx
   {versionId && currentVersion && isEditable ? (
     <div className="card mb-4">
       <div className="flex items-center gap-4">
         <div className="flex-1">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-sm font-semibold text-on-surface">
               {currentVersion.name}
             </span>
             <span className={`chip ${STATUS_CHIP_CLASS[currentVersion.status as BudgetVersionStatus] ?? 'chip-neutral'}`}>
               {STATUS_LABELS[currentVersion.status as BudgetVersionStatus] ?? currentVersion.status}
             </span>
           </div>
           <div className="flex items-center gap-3">
             <div className="flex-1 max-w-md">
               <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                 <div
                   className="h-full bg-primary transition-all"
                   style={{
                     width:
                       totalCustomerCount > 0
                         ? `${(completedCustomerCount / totalCustomerCount) * 100}%`
                         : '0%',
                   }}
                 />
               </div>
             </div>
             <span className="text-xs text-on-surface-variant num whitespace-nowrap">
               {completedCustomerCount}/{totalCustomerCount} müşteri tamamlandı
               {allCustomersComplete ? ' ✓' : ''}
             </span>
           </div>
         </div>
       </div>
     </div>
   ) : null}
   ```

2. Import'ları güncelle (dosya tepesi):

   ```typescript
   import {
     CURRENCIES,
     isEditableStatus,
     MONTHS,
     STATUS_CHIP_CLASS,
     STATUS_LABELS,
   } from '../components/budget-planning/types'
   import type {
     BudgetEntryUpsert,
     BudgetMode,
     BudgetVersionStatus,
     TreeSelection,
   } from '../components/budget-planning/types'
   ```

3. Build:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   ```

4. Tarayıcıda hızlı doğrulama (opsiyonel — gerçek manuel test Task 5.3'te):
   - `/budget/planning` aç, FY 2026 + DRAFT versiyon → banner görünür
   - Entries boşsa: "0/4 müşteri tamamlandı"
   - 1 müşteriye giriş yap → banner "1/4 müşteri tamamlandı"

5. Commit:
   ```bash
   git add client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): üst ilerleme banner'ı + müşteri chip'i

   - Versiyon adı + durum chip'i banner başında
   - İlerleme çubuğu: tamamlandı / toplam oranında dolar
   - 'N/M müşteri tamamlandı ✓' sayaç
   - Sadece düzenlenebilir versiyonda görünür

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 5.3 — E2E doğrulama (manuel — Playwright sonra)

**Files:** none

**Steps:**

1. API + dev server ayakta, `/budget/planning` → FY 2026 → DRAFT versiyon:
   - Banner'da: versiyon adı, Taslak chip'i, ilerleme çubuğu
   - "Onaya Gönder" düğmesi: eksik müşteri yüzünden kilitli, "(N eksik)" yazar
2. Müşteri Odaklı Giriş → Anadolu → bir ay GELIR gir, Taslak Kaydet.
3. Banner güncellenir: "1/4 müşteri tamamlandı"
4. Diğer 3 müşteriye de aynısı. Hepsi olunca:
   - Banner: "4/4 müşteri tamamlandı ✓"
   - "Onaya Gönder" aktif

**Commit yok** (sadece doğrulama).

---

# SECTION 6 — Müşteri Dropdown Chip'i

**Bölüm amacı:** "Müşteri Seç" dropdown'unda her müşterinin yanında 🟢 Tamamlandı / ⚪ Boş chip'i.

## Task 6.1 — Müşteri select'ini zenginleştir

**Files:**
- Modify: `client/src/pages/BudgetEntryPage.tsx`

**Steps:**

1. `customers` dropdown'unda (line ~530 civarı, `<select value={selectedCustomerId ...>`):

   Mevcut `option` render'ı değiştir:

   ```tsx
   {customers.map((c) => {
     const done = completedCustomerIds.has(c.id)
     return (
       <option key={c.id} value={c.id}>
         {done ? '🟢 ' : '⚪ '}
         {c.code} — {c.name}
         {c.segmentName ? ` (${c.segmentName})` : ''}
       </option>
     )
   })}
   ```

   **Not:** Native `<select>` elementleri CSS chip render edemez; emoji/unicode işaret pratik yol. İleride custom dropdown komponenti (Radix/Headless) ile değiştirilebilir — YAGNI.

2. Build + hızlı göz gezdirme.

3. Commit:
   ```bash
   git add client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): müşteri seç dropdown'unda tamamlandı/boş göstergesi

   Her müşteri satırı 🟢 (tamamlandı) veya ⚪ (boş) prefix ile görünür.
   completedCustomerIds set'i üzerinden anlık hesaplanır.

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 7 — ApprovalsPage Refactor

**Bölüm amacı:** Onay Akışı sayfası yeni state machine'e ve rol-bazlı aksiyon görünürlüğüne uyarlanır.

## Task 7.1 — STATUS_META'yı yeni enum'a geçir

**Files:**
- Modify: `client/src/pages/ApprovalsPage.tsx`

**Steps:**

1. Üst kısımdaki `STATUS_META` ve `WorkflowAction` tipini yeniden yaz:

   ```typescript
   import { STATUS_CHIP_CLASS, STATUS_LABELS } from '../components/budget-planning/types'
   import type { BudgetVersionStatus } from '../components/budget-planning/types'

   type WorkflowAction =
     | 'submit'           // Draft|Rejected → PendingFinance
     | 'approve-finance'  // PendingFinance → PendingCfo
     | 'approve-cfo-activate' // PendingCfo → Active + eski Active → Archived
     | 'reject'
     | 'archive'

   const STATUS_META: Record<BudgetVersionStatus, {
     chip: string
     label: string
     nextActions: WorkflowAction[]
   }> = {
     Draft:          { chip: STATUS_CHIP_CLASS.Draft,          label: STATUS_LABELS.Draft,          nextActions: ['submit'] },
     PendingFinance: { chip: STATUS_CHIP_CLASS.PendingFinance, label: STATUS_LABELS.PendingFinance, nextActions: ['approve-finance', 'reject'] },
     PendingCfo:     { chip: STATUS_CHIP_CLASS.PendingCfo,     label: STATUS_LABELS.PendingCfo,     nextActions: ['approve-cfo-activate', 'reject'] },
     Active:         { chip: STATUS_CHIP_CLASS.Active,         label: STATUS_LABELS.Active,         nextActions: ['archive'] },
     Rejected:       { chip: STATUS_CHIP_CLASS.Rejected,       label: STATUS_LABELS.Rejected,       nextActions: ['submit'] },
     Archived:       { chip: STATUS_CHIP_CLASS.Archived,       label: STATUS_LABELS.Archived,       nextActions: [] },
   }

   const ACTION_LABELS: Record<WorkflowAction, string> = {
     submit: 'Onaya Gönder',
     'approve-finance': 'Finans Onayla',
     'approve-cfo-activate': 'Onayla ve Yayına Al',
     reject: 'Reddet',
     archive: 'Arşivle',
   }

   const TERMINAL_STATUSES = new Set<BudgetVersionStatus>(['Archived'])
   ```

2. `statusChipClass` fonksiyonunu kaldır (artık `STATUS_META` yeterli).

3. Section split mantığı (`useMemo` içinde):

   ```typescript
   const { pending, active, terminal } = useMemo(() => {
     const pending: VersionWithYear[] = []
     const active: VersionWithYear[] = []
     const terminal: VersionWithYear[] = []
     for (const v of versions) {
       const status = v.status as BudgetVersionStatus
       if (status === 'Active') active.push(v)
       else if (TERMINAL_STATUSES.has(status)) terminal.push(v)
       else pending.push(v)
     }
     pending.sort((a, b) => b.year - a.year || b.createdAt.localeCompare(a.createdAt))
     active.sort((a, b) => b.year - a.year)
     terminal.sort((a, b) => b.year - a.year)
     return { pending, active, terminal }
   }, [versions])
   ```

   (`toUpperCase()` çağrıları kaldırıldı.)

4. `VersionSection` içinde status key extraction:

   ```typescript
   {versions.map((v) => {
     const status = v.status as BudgetVersionStatus
     const meta = STATUS_META[status] ?? { chip: 'chip-neutral', label: v.status, nextActions: [] }
     ...
   ```

5. Action endpoint mapping (`actionMutation.mutationFn`):

   ```typescript
   const actionMutation = useMutation({
     mutationFn: async ({
       versionId,
       action,
       reason,
     }: { versionId: number; action: WorkflowAction; reason?: string }) => {
       const endpoint = `/budget/versions/${versionId}/${action}`
       const body = action === 'reject' ? { reason: reason ?? 'Belirtilmedi' } : undefined
       await api.post(endpoint, body)
     },
     ...
   ```

   `action` artık URL-safe: `approve-finance`, `approve-cfo-activate`, `submit`, `reject`, `archive`.

6. Build:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   ```

**Expected:** Başarılı.

7. Commit:
   ```bash
   git add client/src/pages/ApprovalsPage.tsx
   git commit -m "refactor(approvals): ApprovalsPage yeni 6-durum state machine'e uyarlandı

   - STATUS_META PascalCase BudgetVersionStatus üzerine bind
   - WorkflowAction: submit, approve-finance, approve-cfo-activate,
     reject, archive (5 aksiyon)
   - Action label: 'Onayla ve Yayına Al' (CFO için)
   - toUpperCase() normalization'ları kaldırıldı

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

## Task 7.2 — Rol-bazlı buton görünürlüğü + "Sadece benimle ilgili" toggle

**Files:**
- Modify: `client/src/pages/ApprovalsPage.tsx`

**Steps:**

1. Component tepesine auth import ekle:

   ```typescript
   import { useAuthStore } from '../stores/auth'
   ```

2. `ApprovalsPage` component içinde roles alıp filter state:

   ```typescript
   const { user } = useAuthStore()
   const roles = user?.roles ?? []
   const isAdmin = roles.includes('Admin')
   const isFinance = isAdmin || roles.includes('FinanceManager')
   const isCfo = isAdmin || roles.includes('CFO')
   const [onlyMine, setOnlyMine] = useState(false)
   const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
   ```

3. Aksiyon button filtresi (`VersionSection` render içinde):

   ```typescript
   const canPerform = (action: WorkflowAction): boolean => {
     switch (action) {
       case 'submit':
         return true  // RequireFinanceRole — Admin de dahil
       case 'approve-finance':
       case 'reject':
         return isFinance || isCfo  // iki aşamadan birinde Reddet
       case 'approve-cfo-activate':
         return isCfo
       case 'archive':
         return isFinance  // RequireFinanceRole
       default:
         return false
     }
   }
   ```

   Ve buton render'ını koşulla sar:

   ```tsx
   {meta.nextActions.filter(canPerform).map((action) => { ... })}
   ```

   Ayrıca hiç aksiyon yoksa "— Yetkisiz —" göster.

4. `onlyMine` toggle versiyon listesini filtrelesin:

   ```typescript
   const visibleVersions = useMemo(() => {
     let list = versions
     if (yearFilter !== 'all') list = list.filter((v) => v.year === yearFilter)
     if (onlyMine) {
       list = list.filter((v) => {
         const status = v.status as BudgetVersionStatus
         if (status === 'PendingFinance') return isFinance || isCfo
         if (status === 'PendingCfo') return isCfo
         if (status === 'Rejected') return true // herkes tekrar gönderebilir
         return false
       })
     }
     return list
   }, [versions, yearFilter, onlyMine, isFinance, isCfo])
   ```

   Ve `pending / active / terminal` hesaplamasında `visibleVersions` kullan.

5. Filtre UI'ı KpiCard row'unun üstüne veya altına ekle:

   ```tsx
   <div className="card mb-4 flex flex-wrap items-center gap-3">
     <span className="label-sm">Filtre</span>
     <select
       className="select"
       value={yearFilter}
       onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
     >
       <option value="all">Tüm yıllar</option>
       {[...new Set(versions.map((v) => v.year))].sort((a, b) => b - a).map((y) => (
         <option key={y} value={y}>FY {y}</option>
       ))}
     </select>
     <label className="flex items-center gap-2 text-sm">
       <input
         type="checkbox"
         checked={onlyMine}
         onChange={(e) => setOnlyMine(e.target.checked)}
       />
       Sadece benimle ilgili
     </label>
   </div>
   ```

6. Build + commit:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   git add client/src/pages/ApprovalsPage.tsx
   git commit -m "feat(approvals): rol-bazlı aksiyon filtresi + Yıl/Sadece benimle filtreleri

   - canPerform(): rolüne uymayan aksiyon butonları gizlenir
   - Yetkisiz durumda '— Yetkisiz —' chip'i
   - Yıl filtresi + Sadece benimle ilgili onaylar toggle

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 8 — BudgetPeriodsPage Refactor

**Bölüm amacı:** Bütçe Versiyonları sayfası yeni enum'a hizalanır. "Yeni Versiyon" sadece yılda çalışılan taslak yoksa enable.

## Task 8.1 — Status chip + transition list güncellemeleri

**Files:**
- Modify: `client/src/pages/BudgetPeriodsPage.tsx`

**Steps:**

1. `STATE_ACTIONS` tipini yeniden yaz:

   ```typescript
   const STATE_ACTIONS: {
     status: BudgetVersionStatus
     label: string
     endpoint: string
     chipClass: string
   }[] = [
     { status: 'Draft', label: 'Onaya Gönder', endpoint: 'submit', chipClass: 'chip-warning' },
     { status: 'PendingFinance', label: 'Finans Onayla', endpoint: 'approve-finance', chipClass: 'chip-info' },
     { status: 'PendingCfo', label: 'Onayla ve Yayına Al', endpoint: 'approve-cfo-activate', chipClass: 'chip-success' },
   ]
   ```

2. `statusChipClass` fonksiyonunu kaldır; `STATUS_CHIP_CLASS` import edip kullan.

3. `canReject` + `canArchive` kontrollerini güncelle:

   ```typescript
   const canReject = ['PendingFinance', 'PendingCfo'].includes(version.status)
   const canArchive = version.status === 'Active'
   ```

4. Butonları `STATE_ACTIONS.find(a => a.status === version.status)` ile bul.

5. "Yeni Versiyon" butonunu kilitle:

   ```typescript
   const hasInProgressDraft = versions.some((v) =>
     ['Draft', 'PendingFinance', 'PendingCfo', 'Rejected'].includes(v.status)
   )
   ```

   Buton:
   ```tsx
   <button
     type="button"
     className="btn-primary"
     disabled={!selectedYearId || hasInProgressDraft}
     title={hasInProgressDraft ? 'Bu yılda zaten çalışılan bir taslak var.' : undefined}
     onClick={...}
   >
     ...Yeni Versiyon
   </button>
   ```

6. Build + commit:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   git add client/src/pages/BudgetPeriodsPage.tsx
   git commit -m "refactor(budget-periods): yeni durum enum + tek-çalışılan-taslak invariant'ı

   - STATE_ACTIONS: 3 aksiyon (submit / approve-finance / approve-cfo-activate)
   - 'Yeni Versiyon' butonu: yıl başına tek çalışılan taslak invariant'ı
     UI'da enforce edilir

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 9 — Revizyon Taslağı Akışı

**Bölüm amacı:** Active versiyon açıkken "Revizyon Taslağı Oluştur" davet banner'ı, tıklayınca `POST /create-revision` ile entry kopyası dahil yeni DRAFT açılır.

## Task 9.1 — BudgetEntryPage banner'ı revizyon akışına bağla

**Files:**
- Modify: `client/src/pages/BudgetEntryPage.tsx`

**Steps:**

1. Mevcut `createDraftMutation` → yeniden kullan: artık `createRevision` endpoint'i çağıracak (ama sadece Active varsa).

2. Active versiyon seçiliyken gösterilen banner'ın zaten hazır olan `createDraftMutation` kullanımını şöyle güncelle:

   ```typescript
   import {
     bulkUpsertEntries,
     createRevision,
     createVersion,
     ...
   } from '../components/budget-planning/api'

   const createRevisionMutation = useMutation({
     mutationFn: async () => {
       if (!versionId) throw new Error('Versiyon seçilmedi')
       return createRevision(versionId)
     },
     onSuccess: (created) => {
       setCreateDraftError(null)
       setVersionId(created.id)
       setSelection(null)
       queryClient.invalidateQueries({ queryKey: ['budget-versions', yearId] })
       queryClient.invalidateQueries({ queryKey: ['budget-entries', created.id] })
     },
     onError: (e: unknown) => {
       setCreateDraftError(
         e instanceof Error ? e.message : 'Revizyon taslağı açılamadı',
       )
     },
   })
   ```

   `createDraftMutation` adını `createRevisionMutation` ile değiştir (grep ile tüm kullanımları güncelle).

3. Mevcut inline banner metnini revizyon odaklı hale getir:

   ```tsx
   {yearId && currentVersion && !isEditable && currentVersion.status === 'Active' ? (
     <div className="card mb-4 flex items-center gap-4 border-l-4 border-primary">
       <span
         className="material-symbols-outlined text-primary"
         style={{ fontSize: 24 }}
       >
         edit_note
       </span>
       <div className="flex-1">
         <p className="text-sm font-semibold text-on-surface">
           {currentVersion.name} <strong>Yürürlükte</strong> — salt-okunur
         </p>
         <p className="text-xs text-on-surface-variant mt-0.5">
           Revize etmek için yeni bir revizyon taslağı açabilirsin. Aktif
           versiyondaki tüm girişler yeni taslağa kopyalanır.
         </p>
       </div>
       <button
         type="button"
         className="btn-primary"
         disabled={createRevisionMutation.isPending}
         onClick={() => {
           setCreateDraftError(null)
           createRevisionMutation.mutate()
         }}
       >
         <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
           edit_note
         </span>
         {createRevisionMutation.isPending
           ? 'Oluşturuluyor…'
           : 'Revizyon Taslağı Oluştur'}
       </button>
     </div>
   ) : null}
   ```

4. Build + commit:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm build
   git add client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): Revizyon Taslağı Oluştur akışı

   - Active versiyon açıkken salt-okunur banner + 'Revizyon Taslağı Oluştur'
   - POST /create-revision: yeni Draft + entry kopyası
   - Yeni taslağa otomatik geçiş

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
   ```

---

# SECTION 10 — E2E Doğrulama (Manuel + Playwright)

**Bölüm amacı:** Full-flow smoke test — yeni taslak oluştur → giriş yap → Onaya Gönder → Finans Onayla → CFO Onayla ve Yayına Al → eski Active Archived olmuş.

## Task 10.1 — Manuel E2E (Playwright MCP ile)

**Files:** none (browser action)

**Steps:**

1. Dev server + API ayakta mı doğrula (`/tmp/budget-api.log`, `http://localhost:3005/`).

2. Playwright ile:
   1. Login: `admin@tag.local` / `Devpass!2026`
   2. `/budget/periods` → FY 2026 seç → "Yeni Versiyon" — versiyonlar listesinde çalışılan taslak yoksa aktifleşir
   3. `/budget/planning` → yeni oluşturulan taslak otomatik seçili
   4. Banner: "0/4 müşteri tamamlandı — Onaya Gönder (4 eksik)" (kilitli)
   5. Her müşteriye en az 1 giriş yap + Taslak Kaydet. Banner "4/4 ✓" olur.
   6. "Onaya Gönder" → confirm → status: Finans Onayında
   7. `/approvals` → Bekleyen satır: "Finans Onayla" butonu → tıkla → status: CFO Onayında
   8. `/approvals` → Bekleyen satır: "Onayla ve Yayına Al" → tıkla
   9. Önceki Active versiyonun "Arşiv" bölümünde göründüğünü doğrula
   10. Yeni versiyon "Yürürlükteki Versiyonlar" bölümünde

3. Tüm adımlar geçiyorsa **✅ E2E doğrulandı** yaz.

4. Eğer hata varsa — ilgili section task'ına geri dönüp fix + yeni commit.

**Commit yok** (runtime).

---

## Task 10.2 — (Opsiyonel) Playwright scripti yaz

**Files:**
- Create: `tests/e2e/approval-flow.spec.ts` (ya da mevcut test dizinine)

**Steps:**

Bu task YAGNI kapsamında: projede henüz Playwright CI entegrasyonu yok. Manuel E2E + `ui-demo` skill'i ile kayıt/hızlı izleme yeterli. Eğer CI'da koşacaksa ayrı ticket.

---

# Executution Handoff

Plan tamamlandı. 25 task, 10 section halinde. Her task 2-5 dakikalık adımlar halinde.

## Execution modları

### Seçenek 1: Subagent-Driven Dev (bu oturum)
Her section için fresh subagent dispatch edilir:
- **Implementer subagent**: kodu yazar, test eder, commit eder
- **Stage 1 — Spec compliance reviewer**: kod plan'a uyuyor mu?
- **Stage 2 — Code quality reviewer**: kod iyi mi yazılmış?
Her section bitince ikinci section'a geçeriz.

### Seçenek 2: Sequential (bu oturum, direkt)
Ben task-by-task kendim uygularım, her section sonunda senden onay alırım. Daha hızlı, ama review stage yok.

### Seçenek 3: Separate Session
Planı kaydedip başka bir Claude Code oturumunda executing-plans skill'i ile koşturursun. Context reset gerekiyorsa uygun.

**Tavsiyem:** Seçenek 2 (Sequential) — tek oturumda toparlarız, ben her section bitince sana kısa bir rapor veririm, onay verirsen bir sonraki section'a geçerim. Subagent overhead'i bu boyutta gereksiz.

---

# Sonraki Adım

Plan dosyasını commit'le + execution mode seç.

```bash
git add docs/plans/2026-04-19-approval-workflow-redesign-plan.md
git commit -m "docs(plan): onay akışı implementation plan"
```

**Execute modu seç: 1 / 2 / 3**
