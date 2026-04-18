namespace BudgetTracker.Application.Products;

public sealed record ProductCategoryDto(
    int Id,
    string Code,
    string Name,
    string? Description,
    int DisplayOrder,
    int? SegmentId,
    string? SegmentName,
    bool IsActive);
