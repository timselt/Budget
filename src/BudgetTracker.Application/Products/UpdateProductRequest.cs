namespace BudgetTracker.Application.Products;

public sealed record UpdateProductRequest(
    int ProductCategoryId,
    string Name,
    int DisplayOrder,
    bool IsActive,
    string? Description = null,
    string? CoverageTermsJson = null,
    string? DefaultCurrencyCode = null);
