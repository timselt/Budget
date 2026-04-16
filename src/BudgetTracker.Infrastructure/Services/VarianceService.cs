using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Variance;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class VarianceService : IVarianceService
{
    private readonly IApplicationDbContext _db;

    public VarianceService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<VarianceSummaryResult> GetVarianceSummaryAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        var budgetEntries = await _db.BudgetEntries
            .AsNoTracking()
            .Where(e => e.VersionId == versionId)
            .ToListAsync(cancellationToken);

        var actualEntries = await _db.ActualEntries
            .AsNoTracking()
            .Where(a => a.BudgetYearId == version.BudgetYearId)
            .ToListAsync(cancellationToken);

        var monthlyVariances = new List<MonthlyVarianceDto>();

        for (var month = 1; month <= 12; month++)
        {
            var budgetRevenue = budgetEntries
                .Where(e => e.Month == month && e.EntryType == EntryType.Revenue)
                .Sum(e => e.AmountTryFixed);

            var budgetClaims = budgetEntries
                .Where(e => e.Month == month && e.EntryType == EntryType.Claim)
                .Sum(e => e.AmountTryFixed);

            var actualRevenue = actualEntries
                .Where(a => a.Month == month && a.EntryType == EntryType.Revenue)
                .Sum(a => a.AmountTryFixed);

            var actualClaims = actualEntries
                .Where(a => a.Month == month && a.EntryType == EntryType.Claim)
                .Sum(a => a.AmountTryFixed);

            var revenueVariance = actualRevenue - budgetRevenue;
            var revenueVariancePct = budgetRevenue != 0
                ? Math.Round(revenueVariance / budgetRevenue, 4, MidpointRounding.ToEven)
                : 0m;

            var claimsVariance = actualClaims - budgetClaims;
            var claimsVariancePct = budgetClaims != 0
                ? Math.Round(claimsVariance / budgetClaims, 4, MidpointRounding.ToEven)
                : 0m;

            var revenueAlert = DetermineRevenueAlert(revenueVariancePct);
            var claimsAlert = DetermineClaimsAlert(claimsVariancePct);

            monthlyVariances.Add(new MonthlyVarianceDto(
                month,
                budgetRevenue,
                actualRevenue,
                revenueVariance,
                revenueVariancePct,
                budgetClaims,
                actualClaims,
                claimsVariance,
                claimsVariancePct,
                revenueAlert,
                claimsAlert));
        }

        return new VarianceSummaryResult(
            monthlyVariances,
            budgetEntries.Where(e => e.EntryType == EntryType.Revenue).Sum(e => e.AmountTryFixed),
            actualEntries.Where(a => a.EntryType == EntryType.Revenue).Sum(a => a.AmountTryFixed),
            budgetEntries.Where(e => e.EntryType == EntryType.Claim).Sum(e => e.AmountTryFixed),
            actualEntries.Where(a => a.EntryType == EntryType.Claim).Sum(a => a.AmountTryFixed));
    }

    public async Task<IReadOnlyList<CustomerVarianceDto>> GetCustomerVarianceAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        var customers = await _db.Customers
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(cancellationToken);

        var budgetEntries = await _db.BudgetEntries
            .AsNoTracking()
            .Where(e => e.VersionId == versionId)
            .ToListAsync(cancellationToken);

        var actualEntries = await _db.ActualEntries
            .AsNoTracking()
            .Where(a => a.BudgetYearId == version.BudgetYearId)
            .ToListAsync(cancellationToken);

        var results = new List<CustomerVarianceDto>();

        foreach (var customer in customers)
        {
            var budgetRevenue = budgetEntries
                .Where(e => e.CustomerId == customer.Id && e.EntryType == EntryType.Revenue)
                .Sum(e => e.AmountTryFixed);

            var budgetClaims = budgetEntries
                .Where(e => e.CustomerId == customer.Id && e.EntryType == EntryType.Claim)
                .Sum(e => e.AmountTryFixed);

            var actualRevenue = actualEntries
                .Where(a => a.CustomerId == customer.Id && a.EntryType == EntryType.Revenue)
                .Sum(a => a.AmountTryFixed);

            var actualClaims = actualEntries
                .Where(a => a.CustomerId == customer.Id && a.EntryType == EntryType.Claim)
                .Sum(a => a.AmountTryFixed);

            var revenueVariance = actualRevenue - budgetRevenue;
            var revenueVariancePct = budgetRevenue != 0
                ? Math.Round(revenueVariance / budgetRevenue, 4, MidpointRounding.ToEven)
                : 0m;

            var claimsVariance = actualClaims - budgetClaims;
            var claimsVariancePct = budgetClaims != 0
                ? Math.Round(claimsVariance / budgetClaims, 4, MidpointRounding.ToEven)
                : 0m;

            var lossRatio = actualRevenue != 0
                ? Math.Round(actualClaims / actualRevenue, 4, MidpointRounding.ToEven)
                : 0m;

            var alert = DetermineCustomerAlert(revenueVariancePct, claimsVariancePct, lossRatio);

            results.Add(new CustomerVarianceDto(
                customer.Id,
                customer.Name,
                customer.Code,
                budgetRevenue,
                actualRevenue,
                revenueVariance,
                revenueVariancePct,
                budgetClaims,
                actualClaims,
                claimsVariance,
                claimsVariancePct,
                lossRatio,
                alert));
        }

        return results;
    }

    public async Task<IReadOnlyList<HeatmapCell>> GetVarianceHeatmapAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        var customers = await _db.Customers
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(cancellationToken);

        var budgetEntries = await _db.BudgetEntries
            .AsNoTracking()
            .Where(e => e.VersionId == versionId && e.EntryType == EntryType.Revenue)
            .ToListAsync(cancellationToken);

        var actualEntries = await _db.ActualEntries
            .AsNoTracking()
            .Where(a => a.BudgetYearId == version.BudgetYearId && a.EntryType == EntryType.Revenue)
            .ToListAsync(cancellationToken);

        var cells = new List<HeatmapCell>();

        foreach (var customer in customers)
        {
            for (var month = 1; month <= 12; month++)
            {
                var budget = budgetEntries
                    .Where(e => e.CustomerId == customer.Id && e.Month == month)
                    .Sum(e => e.AmountTryFixed);

                var actual = actualEntries
                    .Where(a => a.CustomerId == customer.Id && a.Month == month)
                    .Sum(a => a.AmountTryFixed);

                var variance = actual - budget;
                var variancePct = budget != 0
                    ? Math.Round(variance / budget, 4, MidpointRounding.ToEven)
                    : 0m;

                var alert = DetermineRevenueAlert(variancePct);

                cells.Add(new HeatmapCell(
                    customer.Id,
                    customer.Name,
                    month,
                    variancePct,
                    alert));
            }
        }

        return cells;
    }

    private static AlertSeverity? DetermineRevenueAlert(decimal revenueVariancePct)
    {
        return revenueVariancePct switch
        {
            < -0.10m => AlertSeverity.Medium,
            _ => null
        };
    }

    private static AlertSeverity? DetermineClaimsAlert(decimal claimsVariancePct)
    {
        return claimsVariancePct switch
        {
            > 0.15m => AlertSeverity.High,
            _ => null
        };
    }

    private static AlertSeverity? DetermineCustomerAlert(
        decimal revenueVariancePct, decimal claimsVariancePct, decimal lossRatio)
    {
        if (lossRatio > 0.80m) return AlertSeverity.High;
        if (claimsVariancePct > 0.20m) return AlertSeverity.Critical;
        if (revenueVariancePct < -0.10m) return AlertSeverity.Medium;
        if (claimsVariancePct > 0.15m) return AlertSeverity.High;
        return null;
    }
}
