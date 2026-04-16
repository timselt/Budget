namespace BudgetTracker.Application.Approvals;

public sealed record BudgetApprovalDto(
    int Id,
    int VersionId,
    string Stage,
    int StageOrder,
    int? ApproverId,
    string Decision,
    string? Comment,
    DateTimeOffset? DecidedAt);
