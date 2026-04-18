using FluentValidation;

namespace BudgetTracker.Application.Customers;

public sealed class CreateCustomerRequestValidator : AbstractValidator<CreateCustomerRequest>
{
    public CreateCustomerRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SegmentId).GreaterThan(0);
        RuleFor(x => x.CategoryCode).MaximumLength(50);
        RuleFor(x => x.SubCategory).MaximumLength(100);
        RuleFor(x => x.TaxId).MaximumLength(20);
        RuleFor(x => x.TaxOffice).MaximumLength(100);
        RuleFor(x => x.AccountManager).MaximumLength(100);
        RuleFor(x => x.DefaultCurrencyCode)
            .Must(code => string.IsNullOrWhiteSpace(code) || code.Trim().Length == 3)
            .WithMessage("DefaultCurrencyCode 3 karakter olmalıdır.");
    }
}
