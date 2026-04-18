namespace BudgetTracker.Application.ExpenseCategories;

public interface IExpenseCategoryService
{
    Task<IReadOnlyList<ExpenseCategoryDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<ExpenseCategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ExpenseCategoryDto> CreateAsync(CreateExpenseCategoryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<ExpenseCategoryDto> UpdateAsync(int id, UpdateExpenseCategoryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
