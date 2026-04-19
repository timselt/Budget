using FluentValidation;

namespace BudgetTracker.Application.Customers;

/// <summary>
/// Mutabakat önkoşul #1 (00a) — Logo/Mikro/Manuel sistem müşteri kodunu iç
/// müşteriye bağlar. ReconAgent ve Admin rolleri çağırır.
/// </summary>
public sealed record LinkExternalCustomerRequest(
    string ExternalRef,
    string SourceSystem);

public sealed class LinkExternalCustomerRequestValidator : AbstractValidator<LinkExternalCustomerRequest>
{
    public LinkExternalCustomerRequestValidator()
    {
        RuleFor(x => x.ExternalRef).NotEmpty().MaximumLength(32);
        RuleFor(x => x.SourceSystem).NotEmpty().MaximumLength(16)
            .Must(s => s is not null &&
                (s.Equals("LOGO", StringComparison.OrdinalIgnoreCase) ||
                 s.Equals("MIKRO", StringComparison.OrdinalIgnoreCase) ||
                 s.Equals("MANUAL", StringComparison.OrdinalIgnoreCase)))
            .WithMessage("SourceSystem LOGO, MIKRO veya MANUAL olmalı.");
    }
}
