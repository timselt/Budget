using FluentValidation;

namespace BudgetTracker.Application.ExpenseCategories;

public sealed class CreateExpenseCategoryRequestValidator : AbstractValidator<CreateExpenseCategoryRequest>
{
    public CreateExpenseCategoryRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(128);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}
