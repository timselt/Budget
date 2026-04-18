namespace BudgetTracker.Application.BudgetEntries;

public sealed record BudgetEntryUpsert(
    int? Id,
    int CustomerId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    int? ContractId = null,
    int? ProductId = null);
