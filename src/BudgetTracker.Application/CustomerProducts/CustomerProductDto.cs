namespace BudgetTracker.Application.CustomerProducts;

public sealed record CustomerProductDto(
    int Id,
    int CustomerId,
    int ProductId,
    string ProductCode,
    string ProductName,
    int ProductCategoryId,
    string? ProductCategoryName,
    decimal? CommissionRate,
    decimal? UnitPriceTry,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Notes,
    bool IsActive);
