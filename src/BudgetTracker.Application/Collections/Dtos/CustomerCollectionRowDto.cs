using BudgetTracker.Core.Enums;

namespace BudgetTracker.Application.Collections.Dtos;

public sealed record CustomerCollectionRowDto(
    int Rank,
    int CustomerId,
    string CustomerName,
    string? AccountNo,
    decimal TotalReceivable,
    decimal Overdue,
    decimal Pending,
    decimal OverdueRatio,
    decimal SharePercent,
    CollectionRiskLevel RiskLevel,
    double AvgDelayDays);
