namespace BudgetTracker.Application.Customers;

public sealed record CreateCustomerRequest(
    string Code,
    string Name,
    int SegmentId,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null);
