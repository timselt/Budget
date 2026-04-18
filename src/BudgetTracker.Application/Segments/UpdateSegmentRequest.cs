namespace BudgetTracker.Application.Segments;

public sealed record UpdateSegmentRequest(
    string Name,
    int DisplayOrder,
    bool IsActive);
