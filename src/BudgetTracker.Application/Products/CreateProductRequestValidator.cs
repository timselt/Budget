using FluentValidation;

namespace BudgetTracker.Application.Products;

public sealed class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.ProductCategoryId).GreaterThan(0);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DefaultCurrencyCode)
            .Must(code => string.IsNullOrWhiteSpace(code) || code.Trim().Length == 3)
            .WithMessage("DefaultCurrencyCode 3 karakter olmalıdır.");
    }
}
