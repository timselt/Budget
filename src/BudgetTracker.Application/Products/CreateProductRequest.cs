namespace BudgetTracker.Application.Products;

public sealed record CreateProductRequest(
    int ProductCategoryId,
    string Code,
    string Name,
    int DisplayOrder,
    string? Description = null,
    string? CoverageTermsJson = null,
    string? DefaultCurrencyCode = null);
