using FluentValidation;

namespace BudgetTracker.Application.Expenses;

public sealed class CreateExpenseEntryRequestValidator : AbstractValidator<CreateExpenseEntryRequest>
{
    private static readonly string[] ValidEntryTypes = ["BUDGET", "ACTUAL"];

    public CreateExpenseEntryRequestValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.EntryType).Must(t => ValidEntryTypes.Contains(t))
            .WithMessage("EntryType must be BUDGET or ACTUAL");
        RuleFor(x => x.AmountOriginal).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3);
    }
}
