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

    /// <summary>
    /// Draft veya Rejected'tan onaya yeniden gönderim. Resubmit durumunda
    /// RejectionReason temizlenir — yeni akış temiz bir durumla başlar.
    /// </summary>
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

    public void ApproveByFinance(int actorUserId)
    {
        EnsureStatus(BudgetVersionStatus.PendingFinance, nameof(ApproveByFinance));
        Status = BudgetVersionStatus.PendingCfo;
        FinanceApprovedAt = DateTimeOffset.UtcNow;
        FinanceApprovedByUserId = actorUserId;
    }

    /// <summary>
    /// CFO onayı + aktifleştirme atomik tek aksiyon. Eski aktif versiyon
    /// varsa aynı call içinde Archived'a çekilir. Çağrı tarafı (Controller)
    /// eski aktifi aynı transaction'da SaveChanges etmelidir.
    /// </summary>
    public void ApproveByCfoAndActivate(int actorUserId, BudgetVersion? currentActive)
    {
        EnsureStatus(BudgetVersionStatus.PendingCfo, nameof(ApproveByCfoAndActivate));

        if (currentActive is not null && ReferenceEquals(currentActive, this))
        {
            throw new InvalidOperationException(
                "currentActive cannot be the same instance as the version being activated");
        }

        var now = DateTimeOffset.UtcNow;
        CfoApprovedAt = now;
        CfoApprovedByUserId = actorUserId;

        Status = BudgetVersionStatus.Active;
        IsActive = true;
        ActivatedAt = now;
        ActivatedByUserId = actorUserId;

        if (currentActive is not null)
        {
            currentActive.Status = BudgetVersionStatus.Archived;
            currentActive.IsActive = false;
            currentActive.UpdatedAt = now;
            currentActive.UpdatedByUserId = actorUserId;
        }
    }

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

    private void EnsureStatus(BudgetVersionStatus expected, string action)
    {
        if (Status != expected)
        {
            throw new InvalidOperationException(
                $"{action} requires status {expected}, current is {Status}");
        }
    }

    /// <summary>Test helper: state machine'i test ederken doğrudan status set etmek için. Production kodunda kullanılmaz.</summary>
    internal void ForceStatus(BudgetVersionStatus status) => Status = status;

    /// <summary>Test helper: eski aktif arşive atma senaryolarını kurmak için. Production kodunda kullanılmaz.</summary>
    internal void ForceActivate() { IsActive = true; Status = BudgetVersionStatus.Active; }
}
