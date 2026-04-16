namespace BudgetTracker.Application.SpecialItems;

public sealed record CreateSpecialItemRequest(
    string ItemType,
    decimal Amount,
    string CurrencyCode,
    int? Month = null,
    string? Notes = null);
