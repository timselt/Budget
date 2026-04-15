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
    public DateTimeOffset? DeptApprovedAt { get; private set; }
    public int? DeptApprovedByUserId { get; private set; }
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
        EnsureStatus(BudgetVersionStatus.Draft, nameof(Submit));
        Status = BudgetVersionStatus.Submitted;
        SubmittedAt = DateTimeOffset.UtcNow;
        SubmittedByUserId = actorUserId;
    }

    public void ApproveByDepartment(int actorUserId)
    {
        EnsureStatus(BudgetVersionStatus.Submitted, nameof(ApproveByDepartment));
        Status = BudgetVersionStatus.DeptApproved;
        DeptApprovedAt = DateTimeOffset.UtcNow;
        DeptApprovedByUserId = actorUserId;
    }

    public void ApproveByFinance(int actorUserId)
    {
        EnsureStatus(BudgetVersionStatus.DeptApproved, nameof(ApproveByFinance));
        Status = BudgetVersionStatus.FinanceApproved;
        FinanceApprovedAt = DateTimeOffset.UtcNow;
        FinanceApprovedByUserId = actorUserId;
    }

    public void ApproveByCfo(int actorUserId)
    {
        EnsureStatus(BudgetVersionStatus.FinanceApproved, nameof(ApproveByCfo));
        Status = BudgetVersionStatus.CfoApproved;
        CfoApprovedAt = DateTimeOffset.UtcNow;
        CfoApprovedByUserId = actorUserId;
    }

    public void Activate(int actorUserId)
    {
        EnsureStatus(BudgetVersionStatus.CfoApproved, nameof(Activate));
        Status = BudgetVersionStatus.Active;
        IsActive = true;
        ActivatedAt = DateTimeOffset.UtcNow;
        ActivatedByUserId = actorUserId;
    }

    public void Reject(int actorUserId, string reason)
    {
        if (Status is BudgetVersionStatus.Draft or BudgetVersionStatus.Active or BudgetVersionStatus.Archived or BudgetVersionStatus.Rejected)
        {
            throw new InvalidOperationException($"cannot reject from {Status}");
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
}
