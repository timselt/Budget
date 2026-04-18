namespace BudgetTracker.Application.Segments;

public sealed record SegmentDto(
    int Id,
    string Code,
    string Name,
    int DisplayOrder,
    bool IsActive);
