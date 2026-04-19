namespace BudgetTracker.Application.Contracts;

/// <summary>Kontratı manuel sonlandırma isteği (00b §3.1).</summary>
public sealed record TerminateContractRequest(
    string Reason,
    DateOnly EffectiveDate);
