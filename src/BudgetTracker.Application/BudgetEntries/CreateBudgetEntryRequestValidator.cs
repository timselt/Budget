using FluentValidation;

namespace BudgetTracker.Application.BudgetEntries;

public sealed class CreateBudgetEntryRequestValidator : AbstractValidator<CreateBudgetEntryRequest>
{
    private static readonly string[] ValidEntryTypes = ["REVENUE", "CLAIM"];

    public CreateBudgetEntryRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0);
        RuleFor(x => x.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.EntryType).Must(t => ValidEntryTypes.Contains(t))
            .WithMessage("EntryType must be REVENUE or CLAIM");
        RuleFor(x => x.AmountOriginal).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3);
    }
}
