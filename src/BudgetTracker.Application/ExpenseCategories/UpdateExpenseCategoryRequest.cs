using BudgetTracker.Core.Enums;

namespace BudgetTracker.Application.ExpenseCategories;

public sealed record UpdateExpenseCategoryRequest(
    string Name,
    ExpenseClassification Classification,
    int DisplayOrder,
    bool IsActive);
