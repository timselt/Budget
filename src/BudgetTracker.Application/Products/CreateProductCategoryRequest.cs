namespace BudgetTracker.Application.Products;

public sealed record CreateProductCategoryRequest(
    string Code,
    string Name,
    int DisplayOrder,
    string? Description = null,
    int? SegmentId = null);
