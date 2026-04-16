using System.Text.Json;
using BudgetTracker.Application.Calculations;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Scenarios;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class ScenarioService : IScenarioService
{
    private const int MaxScenariosPerVersion = 5;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IKpiCalculationEngine _kpiEngine;

    public ScenarioService(
        IApplicationDbContext db,
        ITenantContext tenant,
        IKpiCalculationEngine kpiEngine)
    {
        _db = db;
        _tenant = tenant;
        _kpiEngine = kpiEngine;
    }

    public async Task<ScenarioDto> CreateScenarioAsync(
        CreateScenarioRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var existingCount = await _db.Scenarios
            .CountAsync(s => s.BudgetVersionId == request.VersionId, cancellationToken);

        if (existingCount >= MaxScenariosPerVersion)
        {
            throw new InvalidOperationException(
                $"Bir versiyon icin en fazla {MaxScenariosPerVersion} senaryo olusturulabilir.");
        }

        var parametersJson = JsonSerializer.Serialize(request.Parameters, JsonOptions);

        var scenario = Scenario.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Name,
            request.VersionId,
            parametersJson,
            actorUserId);

        _db.Scenarios.Add(scenario);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(scenario);
    }

    public async Task<IReadOnlyList<ScenarioDto>> GetScenariosAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var scenarios = await _db.Scenarios
            .Where(s => s.BudgetVersionId == versionId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        return scenarios.Select(ToDto).ToList();
    }

    public async Task<ScenarioPnlResult> GetScenarioPnlAsync(
        int scenarioId, CancellationToken cancellationToken)
    {
        var scenario = await _db.Scenarios
            .FirstOrDefaultAsync(s => s.Id == scenarioId, cancellationToken)
            ?? throw new InvalidOperationException($"Senaryo {scenarioId} bulunamadi.");

        var parameters = DeserializeParameters(scenario.ParametersJson);
        var baseKpi = await _kpiEngine.CalculateAsync(
            scenario.BudgetVersionId, segmentId: null, monthRange: null, cancellationToken);

        var basePnl = ToPnlLineItems(baseKpi);
        var scenarioPnl = ApplyParameters(baseKpi, parameters);
        var delta = CalculateDelta(basePnl, scenarioPnl);

        return new ScenarioPnlResult(
            scenario.Id,
            scenario.Name,
            basePnl,
            scenarioPnl,
            delta);
    }

    public async Task DeleteScenarioAsync(
        int scenarioId, int actorUserId, CancellationToken cancellationToken)
    {
        var scenario = await _db.Scenarios
            .FirstOrDefaultAsync(s => s.Id == scenarioId, cancellationToken)
            ?? throw new InvalidOperationException($"Senaryo {scenarioId} bulunamadi.");

        scenario.MarkDeleted(actorUserId, DateTimeOffset.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ScenarioComparisonResult> CompareScenariosAsync(
        int[] scenarioIds, CancellationToken cancellationToken)
    {
        if (scenarioIds.Length == 0)
        {
            throw new ArgumentException("En az bir senaryo ID gereklidir.", nameof(scenarioIds));
        }

        var scenarios = await _db.Scenarios
            .Where(s => scenarioIds.Contains(s.Id))
            .ToListAsync(cancellationToken);

        if (scenarios.Count == 0)
        {
            throw new InvalidOperationException("Belirtilen senaryolar bulunamadi.");
        }

        var versionId = scenarios[0].BudgetVersionId;
        var baseKpi = await _kpiEngine.CalculateAsync(
            versionId, segmentId: null, monthRange: null, cancellationToken);

        var basePnl = ToPnlLineItems(baseKpi);

        var items = scenarios.Select(s =>
        {
            var parameters = DeserializeParameters(s.ParametersJson);
            var scenarioPnl = ApplyParameters(baseKpi, parameters);
            var delta = CalculateDelta(basePnl, scenarioPnl);

            return new ScenarioComparisonItem(
                s.Id,
                s.Name,
                parameters,
                scenarioPnl,
                delta);
        }).ToList();

        return new ScenarioComparisonResult(basePnl, items);
    }

    private static PnlLineItems ToPnlLineItems(KpiResult kpi) =>
        new(
            TotalRevenue: kpi.TotalRevenue,
            TotalClaims: kpi.TotalClaims,
            TechnicalMargin: kpi.TechnicalMargin,
            GeneralExpenses: kpi.GeneralExpenses,
            TechnicalExpenses: kpi.TechnicalExpenses,
            TechnicalProfit: kpi.TechnicalProfit,
            FinancialIncome: kpi.FinancialIncome,
            FinancialExpenses: kpi.FinancialExpenses,
            NetProfit: kpi.NetProfit,
            Ebitda: kpi.Ebitda,
            LossRatio: kpi.LossRatio,
            CombinedRatio: kpi.CombinedRatio,
            ProfitRatio: kpi.ProfitRatio);

    private static PnlLineItems ApplyParameters(KpiResult baseKpi, ScenarioParameters parameters)
    {
        var revenue = ApplyPct(baseKpi.TotalRevenue, parameters.RevenueChangePct);
        var claims = ApplyPct(baseKpi.TotalClaims, parameters.ClaimsChangePct);
        var generalExpenses = ApplyPct(baseKpi.GeneralExpenses, parameters.ExpenseChangePct);
        var technicalExpenses = ApplyPct(baseKpi.TechnicalExpenses, parameters.ExpenseChangePct);
        var financialExpenses = ApplyPct(baseKpi.FinancialExpenses, parameters.ExpenseChangePct);

        var technicalMargin = revenue - claims;
        var technicalProfit = technicalMargin - technicalExpenses - generalExpenses;
        var netProfit = technicalProfit + baseKpi.FinancialIncome - financialExpenses + baseKpi.TKatilim;
        var ebitda = netProfit + baseKpi.Depreciation + financialExpenses;

        var totalExpenses = generalExpenses + technicalExpenses + financialExpenses;

        return new PnlLineItems(
            TotalRevenue: revenue,
            TotalClaims: claims,
            TechnicalMargin: technicalMargin,
            GeneralExpenses: generalExpenses,
            TechnicalExpenses: technicalExpenses,
            TechnicalProfit: technicalProfit,
            FinancialIncome: baseKpi.FinancialIncome,
            FinancialExpenses: financialExpenses,
            NetProfit: netProfit,
            Ebitda: ebitda,
            LossRatio: SafeRatio(claims, revenue),
            CombinedRatio: SafeRatio(claims, revenue) + SafeRatio(totalExpenses, revenue),
            ProfitRatio: SafeRatio(netProfit, revenue));
    }

    private static PnlLineItems CalculateDelta(PnlLineItems basePnl, PnlLineItems scenarioPnl) =>
        new(
            TotalRevenue: scenarioPnl.TotalRevenue - basePnl.TotalRevenue,
            TotalClaims: scenarioPnl.TotalClaims - basePnl.TotalClaims,
            TechnicalMargin: scenarioPnl.TechnicalMargin - basePnl.TechnicalMargin,
            GeneralExpenses: scenarioPnl.GeneralExpenses - basePnl.GeneralExpenses,
            TechnicalExpenses: scenarioPnl.TechnicalExpenses - basePnl.TechnicalExpenses,
            TechnicalProfit: scenarioPnl.TechnicalProfit - basePnl.TechnicalProfit,
            FinancialIncome: scenarioPnl.FinancialIncome - basePnl.FinancialIncome,
            FinancialExpenses: scenarioPnl.FinancialExpenses - basePnl.FinancialExpenses,
            NetProfit: scenarioPnl.NetProfit - basePnl.NetProfit,
            Ebitda: scenarioPnl.Ebitda - basePnl.Ebitda,
            LossRatio: scenarioPnl.LossRatio - basePnl.LossRatio,
            CombinedRatio: scenarioPnl.CombinedRatio - basePnl.CombinedRatio,
            ProfitRatio: scenarioPnl.ProfitRatio - basePnl.ProfitRatio);

    private static decimal ApplyPct(decimal baseValue, decimal changePct) =>
        Math.Round(baseValue * (1m + changePct / 100m), 2, MidpointRounding.ToEven);

    private static decimal SafeRatio(decimal numerator, decimal denominator) =>
        denominator == 0m ? 0m : Math.Round(numerator / denominator, 4, MidpointRounding.ToEven);

    private static ScenarioDto ToDto(Scenario scenario) =>
        new(
            scenario.Id,
            scenario.Name,
            scenario.BudgetVersionId,
            DeserializeParameters(scenario.ParametersJson),
            scenario.CreatedAt);

    private static ScenarioParameters DeserializeParameters(string json) =>
        JsonSerializer.Deserialize<ScenarioParameters>(json, JsonOptions)
        ?? throw new InvalidOperationException("Senaryo parametreleri ayristirilamadi.");
}
