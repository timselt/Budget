namespace BudgetTracker.Application.Calculations;

public interface IKpiCalculationEngine
{
    Task<KpiResult> CalculateAsync(
        int versionId,
        int? segmentId,
        MonthRange? monthRange,
        CancellationToken cancellationToken);

    Task<ConcentrationResult> CalculateConcentrationAsync(
        int versionId,
        int topN,
        CancellationToken cancellationToken);
}

public sealed record MonthRange(int From, int To);
