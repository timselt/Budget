using FluentValidation;

namespace BudgetTracker.Application.Contracts;

public sealed class TerminateContractRequestValidator : AbstractValidator<TerminateContractRequest>
{
    public TerminateContractRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
        RuleFor(x => x.EffectiveDate).NotEmpty();
    }
}
