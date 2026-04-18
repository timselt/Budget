using FluentValidation;

namespace BudgetTracker.Application.Contracts;

public sealed class CreateContractRequestValidator : AbstractValidator<CreateContractRequest>
{
    public CreateContractRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0);
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.BusinessLine).NotEmpty();
        RuleFor(x => x.SalesType).NotEmpty();
        RuleFor(x => x.ProductType).NotEmpty();
        RuleFor(x => x.VehicleType).NotEmpty();
        RuleFor(x => x.ContractForm).NotEmpty();
        RuleFor(x => x.ContractType).NotEmpty();
        RuleFor(x => x.PaymentFrequency).NotEmpty();
        RuleFor(x => x.AdjustmentClause).NotEmpty();
        RuleFor(x => x.ContractKind).NotEmpty();
        RuleFor(x => x.ServiceArea).NotEmpty();
        RuleFor(x => x.UnitPriceTry).GreaterThanOrEqualTo(0m).When(x => x.UnitPriceTry.HasValue);
        RuleFor(x => x.Notes).MaximumLength(1000);
        When(x => x.StartDate.HasValue && x.EndDate.HasValue, () =>
        {
            RuleFor(x => x.EndDate!.Value)
                .GreaterThanOrEqualTo(x => x.StartDate!.Value)
                .WithMessage("end date must be on or after start date");
        });
    }
}
