namespace BudgetTracker.Application.SpecialItems;

public interface ISpecialItemService
{
    Task<IReadOnlyList<SpecialItemDto>> GetByVersionAsync(int budgetYearId, int? versionId, CancellationToken cancellationToken);
    Task<SpecialItemDto> CreateAsync(int budgetYearId, int? versionId, CreateSpecialItemRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int itemId, int actorUserId, CancellationToken cancellationToken);
}
