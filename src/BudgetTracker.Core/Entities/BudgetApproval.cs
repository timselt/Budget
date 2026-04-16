using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class BudgetApproval : TenantEntity
{
    public int VersionId { get; private set; }
    public ApprovalStage Stage { get; private set; }
    public int StageOrder { get; private set; }
    public int? ApproverId { get; private set; }
    public ApprovalDecision Decision { get; private set; }
    public string? Comment { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }

    private BudgetApproval() { }

    public static BudgetApproval Create(
        int companyId,
        int versionId,
        ApprovalStage stage,
        int stageOrder,
        DateTimeOffset createdAt)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (versionId <= 0) throw new ArgumentOutOfRangeException(nameof(versionId));
        if (stageOrder < 0) throw new ArgumentOutOfRangeException(nameof(stageOrder));

        return new BudgetApproval
        {
            CompanyId = companyId,
            VersionId = versionId,
            Stage = stage,
            StageOrder = stageOrder,
            Decision = ApprovalDecision.Pending,
            CreatedAt = createdAt
        };
    }

    public void Approve(int actorUserId, DateTimeOffset decidedAt, string? comment = null)
    {
        EnsurePending();
        Decision = ApprovalDecision.Approved;
        ApproverId = actorUserId;
        DecidedAt = decidedAt;
        Comment = comment;
    }

    public void Reject(int actorUserId, string reason, DateTimeOffset decidedAt)
    {
        EnsurePending();
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);

        Decision = ApprovalDecision.Rejected;
        ApproverId = actorUserId;
        DecidedAt = decidedAt;
        Comment = reason;
    }

    private void EnsurePending()
    {
        if (Decision != ApprovalDecision.Pending)
            throw new InvalidOperationException($"approval already decided: {Decision}");
    }
}
