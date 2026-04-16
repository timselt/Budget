namespace BudgetTracker.Application.Customers;

public sealed record UpdateCustomerRequest(
    string Name,
    int SegmentId,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null,
    bool IsActive = true);
