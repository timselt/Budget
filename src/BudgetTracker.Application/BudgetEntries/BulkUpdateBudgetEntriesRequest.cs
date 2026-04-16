namespace BudgetTracker.Application.BudgetEntries;

public sealed record BulkUpdateBudgetEntriesRequest(
    IReadOnlyList<BudgetEntryUpsert> Entries);
