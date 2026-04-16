namespace BudgetTracker.Application.Customers;

public sealed record CustomerDto(
    int Id,
    string Code,
    string Name,
    int SegmentId,
    string? SegmentName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool IsActive);
