namespace BudgetTracker.Application.BudgetEntries;

public interface IBudgetEntryService
{
    Task<IReadOnlyList<BudgetEntryDto>> GetByVersionAsync(int versionId, CancellationToken cancellationToken);
    Task<BudgetEntryDto> CreateAsync(int versionId, CreateBudgetEntryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyList<BudgetEntryDto>> BulkUpsertAsync(int versionId, BulkUpdateBudgetEntriesRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int versionId, int entryId, int actorUserId, CancellationToken cancellationToken);
}
