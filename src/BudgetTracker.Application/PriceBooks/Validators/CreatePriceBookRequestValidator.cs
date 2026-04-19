using FluentValidation;

namespace BudgetTracker.Application.PriceBooks.Validators;

public sealed class CreatePriceBookRequestValidator : AbstractValidator<CreatePriceBookRequest>
{
    public CreatePriceBookRequestValidator()
    {
        RuleFor(x => x.EffectiveFrom).NotEmpty();
        RuleFor(x => x.Notes).MaximumLength(1000);
        When(x => x.EffectiveTo.HasValue, () =>
        {
            RuleFor(x => x.EffectiveTo!.Value)
                .GreaterThanOrEqualTo(x => x.EffectiveFrom)
                .WithMessage("effective_to must be on or after effective_from");
        });
    }
}

public sealed class BulkAddItemsRequestValidator : AbstractValidator<BulkAddItemsRequest>
{
    public BulkAddItemsRequestValidator()
    {
        RuleFor(x => x.Items).NotEmpty().WithMessage("at least one item is required");
        RuleForEach(x => x.Items).SetValidator(new PriceBookItemInputValidator());
    }
}

public sealed class PriceBookItemInputValidator : AbstractValidator<PriceBookItemInput>
{
    public PriceBookItemInputValidator()
    {
        RuleFor(x => x.ProductCode).NotEmpty().MaximumLength(64);
        RuleFor(x => x.ProductName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.ItemType).NotEmpty();
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(16);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0m);
        RuleFor(x => x.CurrencyCode)
            .Length(3).WithMessage("currency code must be ISO 4217 (3 letters)")
            .When(x => !string.IsNullOrEmpty(x.CurrencyCode));
        RuleFor(x => x.TaxRate).InclusiveBetween(0m, 100m).When(x => x.TaxRate.HasValue);
        RuleFor(x => x.MinQuantity).GreaterThanOrEqualTo(0m).When(x => x.MinQuantity.HasValue);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}
