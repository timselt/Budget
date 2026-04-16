using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Application.Calculations;

public sealed class KpiCalculationEngine : IKpiCalculationEngine
{
    private readonly IApplicationDbContext _db;

    public KpiCalculationEngine(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<KpiResult> CalculateAsync(
        int versionId,
        int? segmentId,
        MonthRange? monthRange,
        CancellationToken cancellationToken)
    {
        var budgetYearId = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => v.BudgetYearId)
            .FirstOrDefaultAsync(cancellationToken);

        var revenueQuery = _db.BudgetEntries
            .Where(e => e.VersionId == versionId && e.EntryType == EntryType.Revenue);

        var claimQuery = _db.BudgetEntries
            .Where(e => e.VersionId == versionId && e.EntryType == EntryType.Claim);

        if (segmentId.HasValue)
        {
            var customerIds = _db.Customers
                .Where(c => c.SegmentId == segmentId.Value)
                .Select(c => c.Id);

            revenueQuery = revenueQuery.Where(e => customerIds.Contains(e.CustomerId));
            claimQuery = claimQuery.Where(e => customerIds.Contains(e.CustomerId));
        }

        if (monthRange is not null)
        {
            revenueQuery = revenueQuery.Where(e => e.Month >= monthRange.From && e.Month <= monthRange.To);
            claimQuery = claimQuery.Where(e => e.Month >= monthRange.From && e.Month <= monthRange.To);
        }

        var totalRevenue = await revenueQuery.SumAsync(e => e.AmountTryFixed, cancellationToken);
        var totalClaims = await claimQuery.SumAsync(e => e.AmountTryFixed, cancellationToken);

        var expenseQuery = _db.ExpenseEntries
            .Where(e => e.BudgetYearId == budgetYearId && e.EntryType == ExpenseEntryType.Budget);

        if (monthRange is not null)
        {
            expenseQuery = expenseQuery.Where(e => e.Month >= monthRange.From && e.Month <= monthRange.To);
        }

        var expensesByClassification = await _db.ExpenseEntries
            .Join(_db.ExpenseCategories, e => e.CategoryId, c => c.Id, (e, c) => new { e, c })
            .Where(x => x.e.BudgetYearId == budgetYearId && x.e.EntryType == ExpenseEntryType.Budget)
            .Where(x => monthRange == null || (x.e.Month >= monthRange.From && x.e.Month <= monthRange.To))
            .GroupBy(x => x.c.Classification)
            .Select(g => new { Classification = g.Key, Total = g.Sum(x => x.e.AmountTryFixed) })
            .ToListAsync(cancellationToken);

        var generalExpenses = expensesByClassification
            .Where(e => e.Classification == ExpenseClassification.General)
            .Sum(e => e.Total);

        var technicalExpenses = expensesByClassification
            .Where(e => e.Classification == ExpenseClassification.Technical)
            .Sum(e => e.Total);

        var financialExpenses = expensesByClassification
            .Where(e => e.Classification == ExpenseClassification.Financial)
            .Sum(e => e.Total);

        var specialItemQuery = _db.SpecialItems
            .Where(s => s.BudgetYearId == budgetYearId);

        if (monthRange is not null)
        {
            specialItemQuery = specialItemQuery.Where(s => s.Month == null || (s.Month >= monthRange.From && s.Month <= monthRange.To));
        }

        var specialByType = await specialItemQuery
            .GroupBy(s => s.ItemType)
            .Select(g => new { ItemType = g.Key, Total = g.Sum(s => s.Amount) })
            .ToListAsync(cancellationToken);

        var financialIncome = specialByType
            .Where(s => s.ItemType == SpecialItemType.FinansalGelir)
            .Sum(s => s.Total);

        var tKatilim = specialByType
            .Where(s => s.ItemType == SpecialItemType.TKatilim)
            .Sum(s => s.Total);

        var depreciation = specialByType
            .Where(s => s.ItemType == SpecialItemType.Amortisman)
            .Sum(s => s.Total);

        var muallakHasar = specialByType
            .Where(s => s.ItemType == SpecialItemType.MuallakHasar)
            .Sum(s => s.Total);

        var technicalMargin = totalRevenue - totalClaims;
        var technicalProfit = technicalMargin - technicalExpenses - generalExpenses;
        var netProfit = technicalProfit + financialIncome - financialExpenses + tKatilim;
        var ebitda = netProfit + depreciation + financialExpenses;

        var totalExpenses = generalExpenses + technicalExpenses + financialExpenses;

        return new KpiResult(
            TotalRevenue: totalRevenue,
            TotalClaims: totalClaims,
            TechnicalMargin: technicalMargin,
            LossRatio: SafeRatio(totalClaims, totalRevenue),
            GeneralExpenses: generalExpenses,
            TechnicalExpenses: technicalExpenses,
            TechnicalProfit: technicalProfit,
            FinancialIncome: financialIncome,
            FinancialExpenses: financialExpenses,
            TKatilim: tKatilim,
            Depreciation: depreciation,
            NetProfit: netProfit,
            Ebitda: ebitda,
            ExpenseRatio: SafeRatio(totalExpenses, totalRevenue),
            CombinedRatio: SafeRatio(totalClaims, totalRevenue) + SafeRatio(totalExpenses, totalRevenue),
            EbitdaMargin: SafeRatio(ebitda, totalRevenue),
            TechnicalProfitRatio: SafeRatio(technicalProfit, totalRevenue),
            ProfitRatio: SafeRatio(netProfit, totalRevenue),
            MuallakRatio: SafeRatio(muallakHasar, totalClaims));
    }

    public async Task<ConcentrationResult> CalculateConcentrationAsync(
        int versionId, int topN, CancellationToken cancellationToken)
    {
        var customerRevenues = await _db.BudgetEntries
            .Where(e => e.VersionId == versionId && e.EntryType == EntryType.Revenue)
            .GroupBy(e => e.CustomerId)
            .Select(g => new { CustomerId = g.Key, Revenue = g.Sum(e => e.AmountTryFixed) })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);

        var totalRevenue = customerRevenues.Sum(c => c.Revenue);

        if (totalRevenue == 0m)
        {
            return new ConcentrationResult(0m, 0m, []);
        }

        var topCustomers = customerRevenues.Take(topN)
            .Select(c => new CustomerShareDto(
                c.CustomerId, null, c.Revenue,
                Round(c.Revenue / totalRevenue)))
            .ToList();

        var topNShare = Round(topCustomers.Sum(c => c.Revenue) / totalRevenue);

        var hhi = customerRevenues
            .Sum(c =>
            {
                var share = c.Revenue / totalRevenue;
                return share * share;
            });

        return new ConcentrationResult(topNShare, Round(hhi), topCustomers);
    }

    private static decimal SafeRatio(decimal numerator, decimal denominator) =>
        denominator == 0m ? 0m : Round(numerator / denominator);

    private static decimal Round(decimal value) =>
        Math.Round(value, 4, MidpointRounding.ToEven);
}
