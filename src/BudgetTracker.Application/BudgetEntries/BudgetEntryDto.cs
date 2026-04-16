namespace BudgetTracker.Application.BudgetEntries;

public sealed record BudgetEntryDto(
    int Id,
    int VersionId,
    int CustomerId,
    string? CustomerName,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    decimal AmountTryFixed,
    decimal AmountTrySpot);
