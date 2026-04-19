using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Cases;

/// <summary>Case liste satırı — S4/S5 sayfalarında gösterilir.</summary>
public sealed record CaseSummaryDto(
    int Id,
    ReconciliationFlow Flow,
    string PeriodCode,
    int CustomerId,
    string CustomerCode,
    string CustomerName,
    int? ContractId,
    ReconciliationCaseStatus Status,
    int OwnerUserId,
    DateTimeOffset OpenedAt,
    int LineCount,
    decimal TotalAmount,
    string CurrencyCode);

/// <summary>Case detay — lines dahil; S6 Case Detay sayfası.</summary>
public sealed record CaseDetailDto(
    int Id,
    ReconciliationFlow Flow,
    string PeriodCode,
    int CustomerId,
    string CustomerCode,
    string CustomerName,
    int? ContractId,
    ReconciliationCaseStatus Status,
    int OwnerUserId,
    DateTimeOffset OpenedAt,
    DateTimeOffset? SentToCustomerAt,
    DateTimeOffset? CustomerResponseAt,
    DateTimeOffset? SentToAccountingAt,
    decimal TotalAmount,
    string CurrencyCode,
    string? Notes,
    IReadOnlyList<LineDto> Lines);

public sealed record LineDto(
    int Id,
    int CaseId,
    int SourceRowId,
    string ProductCode,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal Amount,
    string CurrencyCode,
    string PriceSourceRef,
    ReconciliationLineStatus Status,
    DisputeReasonCode? DisputeReasonCode,
    string? DisputeNote);

/// <summary>Case liste filtresi.</summary>
public sealed record CaseListQuery(
    ReconciliationFlow? Flow = null,
    string? PeriodCode = null,
    ReconciliationCaseStatus? Status = null,
    int? CustomerId = null,
    int? OwnerUserId = null,
    int? BatchId = null);

public sealed record AssignOwnerRequest(int UserId);

public sealed record UpdateLineRequest(
    decimal? Quantity = null,
    decimal? UnitPrice = null,
    string? Note = null);
