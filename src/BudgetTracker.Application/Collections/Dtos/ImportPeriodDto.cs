namespace BudgetTracker.Application.Collections.Dtos;

public sealed record ImportPeriodDto(
    int Id,
    int SegmentId,
    string SegmentName,
    DateTime ImportDate,
    string FileName,
    string? PeriodLabel,
    decimal TotalAmount,
    decimal OverdueAmount,
    decimal PendingAmount,
    string Status);
