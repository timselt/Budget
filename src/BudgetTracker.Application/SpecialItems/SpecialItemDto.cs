namespace BudgetTracker.Application.SpecialItems;

public sealed record SpecialItemDto(
    int Id,
    int? VersionId,
    int BudgetYearId,
    string ItemType,
    int? Month,
    decimal Amount,
    string CurrencyCode,
    string? Notes);
