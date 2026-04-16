namespace BudgetTracker.Application.Expenses;

public sealed record ExpenseEntryDto(
    int Id,
    int? VersionId,
    int BudgetYearId,
    int CategoryId,
    string? CategoryName,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    decimal AmountTryFixed,
    decimal AmountTrySpot);
