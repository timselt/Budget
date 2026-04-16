namespace BudgetTracker.Application.Expenses;

public sealed record CreateExpenseEntryRequest(
    int CategoryId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    string? Notes = null);
