namespace BudgetTracker.Application.Contracts;

/// <summary>
/// Kontrat revizyonu (ADR-0014 §2.3). <see cref="ChangeType"/> ContractChangeType
/// enum string değeri: LimitChange / PriceChange / LimitAndPrice / CoverageChange
/// / VehicleChange / PeriodRenewal. ChangeType'a göre:
/// <list type="bullet">
/// <item>LimitChange / LimitAndPrice / VehicleChange / PeriodRenewal → Version++</item>
/// <item>PriceChange → UnitPriceTry update, versiyon atlamaz</item>
/// <item>CoverageChange → yeni Product + yeni Contract (handler katmanında)</item>
/// </list>
/// </summary>
public sealed record ReviseContractRequest(
    string ChangeType,
    decimal? NewUnitPriceTry = null,
    string? Note = null);
