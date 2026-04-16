namespace BudgetTracker.Application.BudgetEntries;

public sealed record CreateBudgetEntryRequest(
    int CustomerId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode);
