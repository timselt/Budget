namespace BudgetTracker.Application.Collections.Dtos;

public sealed record RiskDistributionDto(
    int HighCount,
    int MediumCount,
    int LowCount,
    decimal HighAmount,
    decimal MediumAmount,
    decimal LowAmount);
