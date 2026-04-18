namespace BudgetTracker.Application.Customers;

public sealed record CustomerDto(
    int Id,
    string Code,
    string Name,
    string? CategoryCode,
    string? SubCategory,
    string? TaxId,
    string? TaxOffice,
    int SegmentId,
    string? SegmentName,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool IsGroupInternal,
    string? AccountManager,
    string? DefaultCurrencyCode,
    bool IsActive);
