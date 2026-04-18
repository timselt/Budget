namespace BudgetTracker.Application.Products;

public sealed record UpdateProductCategoryRequest(
    string Name,
    int DisplayOrder,
    bool IsActive,
    string? Description = null,
    int? SegmentId = null);
