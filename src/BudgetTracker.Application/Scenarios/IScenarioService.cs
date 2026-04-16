namespace BudgetTracker.Application.Scenarios;

public interface IScenarioService
{
    Task<ScenarioDto> CreateScenarioAsync(
        CreateScenarioRequest request, int actorUserId, CancellationToken cancellationToken);

    Task<IReadOnlyList<ScenarioDto>> GetScenariosAsync(
        int versionId, CancellationToken cancellationToken);

    Task<ScenarioPnlResult> GetScenarioPnlAsync(
        int scenarioId, CancellationToken cancellationToken);

    Task DeleteScenarioAsync(
        int scenarioId, int actorUserId, CancellationToken cancellationToken);

    Task<ScenarioComparisonResult> CompareScenariosAsync(
        int[] scenarioIds, CancellationToken cancellationToken);
}

public sealed record ScenarioParameters(
    decimal RevenueChangePct,
    decimal ClaimsChangePct,
    decimal ExpenseChangePct);

public sealed record CreateScenarioRequest(
    string Name,
    int VersionId,
    ScenarioParameters Parameters);

public sealed record ScenarioDto(
    int Id,
    string Name,
    int BudgetVersionId,
    ScenarioParameters Parameters,
    DateTimeOffset CreatedAt);

public sealed record ScenarioPnlResult(
    int ScenarioId,
    string ScenarioName,
    PnlLineItems Base,
    PnlLineItems Scenario,
    PnlLineItems Delta);

public sealed record PnlLineItems(
    decimal TotalRevenue,
    decimal TotalClaims,
    decimal TechnicalMargin,
    decimal GeneralExpenses,
    decimal TechnicalExpenses,
    decimal TechnicalProfit,
    decimal FinancialIncome,
    decimal FinancialExpenses,
    decimal NetProfit,
    decimal Ebitda,
    decimal LossRatio,
    decimal CombinedRatio,
    decimal ProfitRatio);

public sealed record ScenarioComparisonResult(
    PnlLineItems Base,
    IReadOnlyList<ScenarioComparisonItem> Scenarios);

public sealed record ScenarioComparisonItem(
    int ScenarioId,
    string ScenarioName,
    ScenarioParameters Parameters,
    PnlLineItems Pnl,
    PnlLineItems Delta);
