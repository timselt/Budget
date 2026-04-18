using BudgetTracker.Core.Enums;

namespace BudgetTracker.Application.ExpenseCategories;

public sealed record CreateExpenseCategoryRequest(
    string Code,
    string Name,
    ExpenseClassification Classification,
    int DisplayOrder);
