namespace BudgetTracker.Application.Variance;

public interface IVarianceService
{
    Task<VarianceSummaryResult> GetVarianceSummaryAsync(
        int versionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<CustomerVarianceDto>> GetCustomerVarianceAsync(
        int versionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<HeatmapCell>> GetVarianceHeatmapAsync(
        int versionId, CancellationToken cancellationToken);
}

public sealed record VarianceSummaryResult(
    IReadOnlyList<MonthlyVarianceDto> MonthlyVariances,
    decimal TotalBudgetRevenue,
    decimal TotalActualRevenue,
    decimal TotalBudgetClaims,
    decimal TotalActualClaims);

public sealed record MonthlyVarianceDto(
    int Month,
    decimal BudgetRevenue,
    decimal ActualRevenue,
    decimal RevenueVariance,
    decimal RevenueVariancePercent,
    decimal BudgetClaims,
    decimal ActualClaims,
    decimal ClaimsVariance,
    decimal ClaimsVariancePercent,
    AlertSeverity? RevenueAlert,
    AlertSeverity? ClaimsAlert);

public sealed record CustomerVarianceDto(
    int CustomerId,
    string CustomerName,
    string CustomerCode,
    decimal BudgetRevenue,
    decimal ActualRevenue,
    decimal RevenueVariance,
    decimal RevenueVariancePercent,
    decimal BudgetClaims,
    decimal ActualClaims,
    decimal ClaimsVariance,
    decimal ClaimsVariancePercent,
    decimal LossRatio,
    AlertSeverity? Alert);

public sealed record HeatmapCell(
    int CustomerId,
    string CustomerName,
    int Month,
    decimal VariancePercent,
    AlertSeverity? Alert);

public enum AlertSeverity
{
    Medium = 0,
    High = 1,
    Critical = 2
}
