namespace BudgetTracker.Application.CustomerProducts;

public sealed record CreateCustomerProductRequest(
    int ProductId,
    decimal? UnitPriceTry = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null);
