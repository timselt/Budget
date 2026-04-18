namespace BudgetTracker.Application.Products;

public sealed record ProductDto(
    int Id,
    int ProductCategoryId,
    string? ProductCategoryName,
    string Code,
    string Name,
    string? Description,
    string? CoverageTermsJson,
    string? DefaultCurrencyCode,
    int DisplayOrder,
    bool IsActive);
