using BudgetTracker.Core.Enums;

namespace BudgetTracker.Application.ExpenseCategories;

public sealed record ExpenseCategoryDto(
    int Id,
    string Code,
    string Name,
    ExpenseClassification Classification,
    int DisplayOrder,
    bool IsActive);
