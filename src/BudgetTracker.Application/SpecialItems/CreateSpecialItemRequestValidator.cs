using FluentValidation;

namespace BudgetTracker.Application.SpecialItems;

public sealed class CreateSpecialItemRequestValidator : AbstractValidator<CreateSpecialItemRequest>
{
    private static readonly string[] ValidItemTypes =
        ["MUALLAK_HASAR", "DEMO_FILO", "FINANSAL_GELIR", "T_KATILIM", "AMORTISMAN"];

    public CreateSpecialItemRequestValidator()
    {
        RuleFor(x => x.ItemType).Must(t => ValidItemTypes.Contains(t))
            .WithMessage("Invalid item type");
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3);
        RuleFor(x => x.Month).InclusiveBetween(1, 12).When(x => x.Month.HasValue);
    }
}
