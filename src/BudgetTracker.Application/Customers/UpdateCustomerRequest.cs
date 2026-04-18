namespace BudgetTracker.Application.Customers;

public sealed record UpdateCustomerRequest(
    string Name,
    int SegmentId,
    string? CategoryCode = null,
    string? SubCategory = null,
    string? TaxId = null,
    string? TaxOffice = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    bool IsGroupInternal = false,
    string? AccountManager = null,
    string? DefaultCurrencyCode = null,
    string? Notes = null,
    bool IsActive = true);
