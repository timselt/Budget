namespace BudgetTracker.Application.Expenses;

public interface IExpenseEntryService
{
    Task<IReadOnlyList<ExpenseEntryDto>> GetByVersionAsync(int versionId, int budgetYearId, CancellationToken cancellationToken);
    Task<ExpenseEntryDto> CreateAsync(int budgetYearId, int? versionId, CreateExpenseEntryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int entryId, int actorUserId, CancellationToken cancellationToken);
}
