namespace BudgetTracker.Application.Contracts;

/// <summary>
/// Yeni kontrat oluşturma isteği. customerShortId müşteri kaydından auto-doldurulabilir
/// (servis katmanı), ancak API explicit kabul ediyor — test/migration için esneklik.
/// <see cref="InitialStatus"/> verilmezse <c>Active</c> varsayılır (ADR-0014 geri uyumlu).
/// </summary>
public sealed record CreateContractRequest(
    int CustomerId,
    int ProductId,
    string BusinessLine,
    string SalesType,
    string ProductType,
    string VehicleType,
    string ContractForm,
    string ContractType,
    string PaymentFrequency,
    string AdjustmentClause,
    string ContractKind,
    string ServiceArea,
    decimal? UnitPriceTry = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null,
    string? ContractName = null,
    string? CurrencyCode = null,
    string? InitialStatus = null);
