namespace BudgetTracker.Application.CustomerProducts;

public sealed record UpdateCustomerProductRequest(
    bool IsActive,
    decimal? CommissionRate = null,
    decimal? UnitPriceTry = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null);
