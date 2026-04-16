namespace BudgetTracker.Application.Collections.Dtos;

public sealed record SegmentSummaryDto(
    int SegmentId,
    string SegmentName,
    decimal TotalReceivable,
    decimal Overdue,
    decimal Pending,
    decimal OverdueRatio,
    int CustomerCount,
    int HighRiskCount,
    int MediumRiskCount,
    int LowRiskCount);
