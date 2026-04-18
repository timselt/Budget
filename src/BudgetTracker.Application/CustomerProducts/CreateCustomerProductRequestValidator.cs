using FluentValidation;

namespace BudgetTracker.Application.CustomerProducts;

public sealed class CreateCustomerProductRequestValidator : AbstractValidator<CreateCustomerProductRequest>
{
    public CreateCustomerProductRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.UnitPriceTry)
            .GreaterThanOrEqualTo(0m)
            .When(x => x.UnitPriceTry.HasValue);
        RuleFor(x => x)
            .Must(x => !x.StartDate.HasValue || !x.EndDate.HasValue || x.EndDate.Value >= x.StartDate.Value)
            .WithMessage("EndDate, StartDate'den önce olamaz.");
    }
}
