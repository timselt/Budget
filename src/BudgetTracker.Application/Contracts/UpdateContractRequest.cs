namespace BudgetTracker.Application.Contracts;

/// <summary>
/// Kontrat güncelleme — sadece non-metadata alanlar. Metadata değişikliği
/// <see cref="ReviseContractRequest"/> ile yapılmalı (domain service kuralları).
/// </summary>
public sealed record UpdateContractRequest(
    decimal? UnitPriceTry,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Notes,
    bool IsActive);
