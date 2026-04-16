namespace BudgetTracker.Application.Collections.Dtos;

public sealed record ConsolidatedDashboardDto(
    decimal TotalReceivable,
    decimal TotalOverdue,
    decimal TotalPending,
    decimal OverdueRatio,
    List<SegmentSummaryDto> Segments,
    List<TopOverdueCustomerDto> TopOverdueCustomers,
    RiskDistributionDto RiskDistribution);
