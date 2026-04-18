namespace BudgetTracker.Application.Contracts;

/// <summary>
/// Müşteri-ürün kontratı görünüm modeli. 14-segment kontrat kodu + metadata +
/// Contract.UnitPriceTry + tarihler. ADR-0014.
/// </summary>
public sealed record ContractDto(
    int Id,
    int CustomerId,
    int CustomerShortId,
    string CustomerCode,
    string CustomerName,
    int ProductId,
    string ProductCode,
    string ProductName,
    string ContractCode,
    int Version,
    int RevisionCount,
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
    decimal? UnitPriceTry,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Notes,
    bool IsActive);
