namespace BudgetTracker.Application.Segments;

public sealed record CreateSegmentRequest(
    string Code,
    string Name,
    int DisplayOrder);
