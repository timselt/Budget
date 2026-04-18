using FluentValidation;

namespace BudgetTracker.Application.Segments;

public sealed class CreateSegmentRequestValidator : AbstractValidator<CreateSegmentRequest>
{
    public CreateSegmentRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}
