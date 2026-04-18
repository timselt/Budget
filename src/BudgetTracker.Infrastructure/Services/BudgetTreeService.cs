using BudgetTracker.Application.BudgetTree;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// Bütçe planlama tree agregasyonu — BudgetEntryPage sol panel ağacı +
/// OPEX kategorileri + müşteri meta satırı için tek-çağrı DTO üretir.
/// ADR-0014 sonrası <c>ActiveContractCount</c> Contract entity'sinden
/// gelecek; şu an <c>CustomerProduct.IsActive</c> sayımı.
/// </summary>
public sealed class BudgetTreeService : IBudgetTreeService
{
    private const int MonthsInYear = 12;

    private readonly IApplicationDbContext _db;

    public BudgetTreeService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<BudgetTreeDto> GetAsync(int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => new { v.Id, v.Name, v.Status, v.BudgetYearId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"Budget version {versionId} not found");

        var budgetYear = await _db.BudgetYears
            .Where(y => y.Id == version.BudgetYearId)
            .Select(y => y.Year)
            .FirstOrDefaultAsync(cancellationToken);

        // --- Sıralı sorgular: aynı DbContext üzerinde paralel query
        // desteklenmez (EF Core concurrency guard). Ayrı context'ler açmak
        // yerine sıralı await — şu anki veri hacminde (~2500 satır) round-trip
        // maliyeti kabul edilebilir.

        var budgetRows = await _db.BudgetEntries
            .Where(e => e.VersionId == versionId)
            .GroupBy(e => new { e.CustomerId, e.Month, e.EntryType })
            .Select(g => new AggregatedEntryRow(
                g.Key.CustomerId,
                g.Key.Month,
                g.Key.EntryType,
                g.Sum(x => x.AmountTryFixed)))
            .ToListAsync(cancellationToken);

        var expenseRows = await _db.ExpenseEntries
            .Where(e => e.VersionId == versionId)
            .GroupBy(e => new { e.CategoryId, e.Month })
            .Select(g => new AggregatedExpenseRow(
                g.Key.CategoryId,
                g.Key.Month,
                g.Sum(x => x.AmountTryFixed)))
            .ToListAsync(cancellationToken);

        var customers = await _db.Customers
            .Where(c => c.IsActive)
            .Select(c => new CustomerRow(c.Id, c.Code, c.Name, c.SegmentId))
            .ToListAsync(cancellationToken);

        var segments = await _db.Segments
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .Select(s => new SegmentRow(s.Id, s.Code, s.Name))
            .ToListAsync(cancellationToken);

        var expenseCategories = await _db.ExpenseCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new ExpenseCategoryRow(c.Id, c.Code, c.Name, c.Classification))
            .ToListAsync(cancellationToken);

        var contractCounts = (await _db.Contracts
            .Where(cp => cp.IsActive)
            .GroupBy(cp => cp.CustomerId)
            .Select(g => new { CustomerId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken))
            .ToDictionary(x => x.CustomerId, x => x.Count);

        // --- Bucket customers & monthly sums ---

        var customersBySegment = customers
            .GroupBy(c => c.SegmentId)
            .ToDictionary(g => g.Key, g => g.OrderBy(c => c.Name).ToList());

        var revenueByCustomer = BuildMonthlyMatrix(
            budgetRows.Where(r => r.EntryType == EntryType.Revenue));
        var claimByCustomer = BuildMonthlyMatrix(
            budgetRows.Where(r => r.EntryType == EntryType.Claim));

        var segmentDtos = new List<BudgetTreeSegmentDto>(segments.Count);
        decimal totalRevenue = 0m;
        decimal totalClaim = 0m;

        foreach (var segment in segments)
        {
            if (!customersBySegment.TryGetValue(segment.Id, out var segmentCustomers))
            {
                continue;
            }

            var customerDtos = new List<BudgetTreeCustomerDto>(segmentCustomers.Count);
            decimal segRevenue = 0m;
            decimal segClaim = 0m;

            foreach (var customer in segmentCustomers)
            {
                var revenueMonthly = revenueByCustomer.GetValueOrDefault(customer.Id)
                    ?? NewZeroArray();
                var claimMonthly = claimByCustomer.GetValueOrDefault(customer.Id)
                    ?? NewZeroArray();

                var revenueTotal = revenueMonthly.Sum();
                var claimTotal = claimMonthly.Sum();
                var lossRatio = revenueTotal == 0m
                    ? 0m
                    : Math.Round((claimTotal / revenueTotal) * 100m, 2, MidpointRounding.ToEven);

                segRevenue += revenueTotal;
                segClaim += claimTotal;

                customerDtos.Add(new BudgetTreeCustomerDto(
                    customer.Id,
                    customer.Code,
                    customer.Name,
                    customer.SegmentId,
                    contractCounts.GetValueOrDefault(customer.Id),
                    revenueTotal,
                    claimTotal,
                    lossRatio,
                    revenueMonthly,
                    claimMonthly));
            }

            totalRevenue += segRevenue;
            totalClaim += segClaim;

            segmentDtos.Add(new BudgetTreeSegmentDto(
                segment.Id, segment.Code, segment.Name,
                segRevenue, segClaim, customerDtos));
        }

        // --- OPEX categories ---

        var expenseByCategory = new Dictionary<int, decimal[]>(expenseCategories.Count);
        foreach (var row in expenseRows)
        {
            if (row.Month is < 1 or > MonthsInYear) continue;
            if (!expenseByCategory.TryGetValue(row.CategoryId, out var arr))
            {
                arr = NewZeroArray();
                expenseByCategory[row.CategoryId] = arr;
            }
            arr[row.Month - 1] = row.AmountTryFixed;
        }

        var opexDtos = new List<BudgetTreeOpexDto>(expenseCategories.Count);
        decimal totalExpense = 0m;

        foreach (var cat in expenseCategories)
        {
            var monthly = expenseByCategory.GetValueOrDefault(cat.Id) ?? NewZeroArray();
            var total = monthly.Sum();
            totalExpense += total;

            opexDtos.Add(new BudgetTreeOpexDto(
                cat.Id, cat.Code, cat.Name,
                cat.Classification.ToString().ToUpperInvariant(),
                total, monthly));
        }

        return new BudgetTreeDto(
            version.Id,
            version.Name,
            version.Status.ToString().ToUpperInvariant(),
            budgetYear,
            totalRevenue,
            totalClaim,
            totalExpense,
            segmentDtos,
            opexDtos);
    }

    public async Task<CustomerBudgetSummaryDto> GetCustomerSummaryAsync(
        int customerId, int versionId, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers
            .Where(c => c.Id == customerId)
            .Select(c => new { c.Id, c.Code, c.Name })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"Customer {customerId} not found");

        var totals = await _db.BudgetEntries
            .Where(e => e.VersionId == versionId && e.CustomerId == customerId)
            .GroupBy(e => e.EntryType)
            .Select(g => new { EntryType = g.Key, Total = g.Sum(x => x.AmountTryFixed) })
            .ToListAsync(cancellationToken);

        var contractCount = await _db.Contracts
            .CountAsync(cp => cp.CustomerId == customerId && cp.IsActive, cancellationToken);

        var revenue = totals.FirstOrDefault(t => t.EntryType == EntryType.Revenue)?.Total ?? 0m;
        var claim = totals.FirstOrDefault(t => t.EntryType == EntryType.Claim)?.Total ?? 0m;
        var lossRatio = revenue == 0m
            ? 0m
            : Math.Round((claim / revenue) * 100m, 2, MidpointRounding.ToEven);

        return new CustomerBudgetSummaryDto(
            customer.Id, customer.Code, customer.Name,
            contractCount, revenue, claim, lossRatio);
    }

    private static Dictionary<int, decimal[]> BuildMonthlyMatrix(
        IEnumerable<AggregatedEntryRow> rows)
    {
        var result = new Dictionary<int, decimal[]>();
        foreach (var row in rows)
        {
            if (row.Month is < 1 or > MonthsInYear) continue;
            if (!result.TryGetValue(row.CustomerId, out var arr))
            {
                arr = NewZeroArray();
                result[row.CustomerId] = arr;
            }
            arr[row.Month - 1] = row.AmountTryFixed;
        }
        return result;
    }

    private static decimal[] NewZeroArray() => new decimal[MonthsInYear];

    private sealed record AggregatedEntryRow(
        int CustomerId, int Month, EntryType EntryType, decimal AmountTryFixed);

    private sealed record AggregatedExpenseRow(
        int CategoryId, int Month, decimal AmountTryFixed);

    private sealed record CustomerRow(int Id, string Code, string Name, int SegmentId);

    private sealed record SegmentRow(int Id, string Code, string Name);

    private sealed record ExpenseCategoryRow(
        int Id, string Code, string Name, ExpenseClassification Classification);
}
