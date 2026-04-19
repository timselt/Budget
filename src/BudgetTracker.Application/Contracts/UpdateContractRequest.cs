namespace BudgetTracker.Application.Contracts;

/// <summary>
/// Kontrat güncelleme — sadece non-metadata alanlar. Metadata değişikliği
/// <see cref="ReviseContractRequest"/> ile yapılmalı (domain service kuralları).
/// 00b: <see cref="ContractName"/>, <see cref="CurrencyCode"/> eklendi.
/// </summary>
public sealed record UpdateContractRequest(
    decimal? UnitPriceTry,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Notes,
    bool IsActive,
    string? ContractName = null,
    string? CurrencyCode = null);
