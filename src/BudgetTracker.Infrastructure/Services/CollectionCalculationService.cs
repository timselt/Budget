using BudgetTracker.Application.Collections;
using BudgetTracker.Application.Collections.Dtos;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CollectionCalculationService : ICollectionCalculationService
{
    private const int TOP_N_DEFAULT = 10;

    private readonly IApplicationDbContext _db;

    public CollectionCalculationService(IApplicationDbContext db)
    {
        _db = db;
    }

    public CollectionRiskLevel CalculateRisk(decimal overdueAmount, double avgDelayDays)
    {
        if (overdueAmount <= 0m || avgDelayDays < 10)
        {
            return CollectionRiskLevel.Low;
        }

        return avgDelayDays >= 90
            ? CollectionRiskLevel.High
            : CollectionRiskLevel.Medium;
    }

    public async Task<ConsolidatedDashboardDto> GetConsolidatedDashboardAsync(
        int companyId,
        int? periodId = null,
        CancellationToken ct = default)
    {
        var invoicesQuery = BuildInvoicesQuery(companyId, periodId);

        var segmentLookup = await _db.Segments
            .Where(s => s.CompanyId == companyId)
            .ToDictionaryAsync(s => s.Id, s => s.Name, ct);

        var invoices = await invoicesQuery
            .Select(i => new
            {
                i.CustomerId,
                CustomerName = i.Customer.Name,
                i.Customer.SegmentId,
                i.Amount,
                i.Status,
                i.DaysDiff
            })
            .ToListAsync(ct);

        var invoicesWithSegment = invoices
            .Select(i => new
            {
                i.CustomerId,
                i.CustomerName,
                i.SegmentId,
                SegmentName = segmentLookup.GetValueOrDefault(i.SegmentId, "Unknown"),
                i.Amount,
                i.Status,
                i.DaysDiff
            })
            .ToList();

        var totalReceivable = invoicesWithSegment.Sum(i => i.Amount);
        var totalOverdue = invoicesWithSegment
            .Where(i => i.Status == InvoiceCollectionStatus.Overdue)
            .Sum(i => i.Amount);
        var totalPending = invoicesWithSegment
            .Where(i => i.Status == InvoiceCollectionStatus.Pending)
            .Sum(i => i.Amount);
        var overdueRatio = totalReceivable > 0m
            ? Math.Round(totalOverdue / totalReceivable * 100m, 2, MidpointRounding.ToEven)
            : 0m;

        var customerGroups = invoicesWithSegment
            .GroupBy(i => new { i.CustomerId, i.CustomerName, i.SegmentId, i.SegmentName })
            .Select(g =>
            {
                var custOverdue = g.Where(x => x.Status == InvoiceCollectionStatus.Overdue).Sum(x => x.Amount);
                var avgDelay = g.Average(x => (double)x.DaysDiff);
                return new
                {
                    g.Key.CustomerId,
                    g.Key.CustomerName,
                    g.Key.SegmentId,
                    g.Key.SegmentName,
                    Total = g.Sum(x => x.Amount),
                    Overdue = custOverdue,
                    Pending = g.Where(x => x.Status == InvoiceCollectionStatus.Pending).Sum(x => x.Amount),
                    AvgDelay = avgDelay,
                    Risk = CalculateRisk(custOverdue, avgDelay)
                };
            })
            .ToList();

        var segments = customerGroups
            .GroupBy(c => new { c.SegmentId, c.SegmentName })
            .Select(sg => new SegmentSummaryDto(
                sg.Key.SegmentId,
                sg.Key.SegmentName,
                sg.Sum(c => c.Total),
                sg.Sum(c => c.Overdue),
                sg.Sum(c => c.Pending),
                sg.Sum(c => c.Total) > 0m
                    ? Math.Round(sg.Sum(c => c.Overdue) / sg.Sum(c => c.Total) * 100m, 2, MidpointRounding.ToEven)
                    : 0m,
                sg.Count(),
                sg.Count(c => c.Risk == CollectionRiskLevel.High),
                sg.Count(c => c.Risk == CollectionRiskLevel.Medium),
                sg.Count(c => c.Risk == CollectionRiskLevel.Low)))
            .OrderByDescending(s => s.TotalReceivable)
            .ToList();

        var topOverdue = customerGroups
            .Where(c => c.Overdue > 0m)
            .OrderByDescending(c => c.Overdue)
            .Take(TOP_N_DEFAULT)
            .Select(c => new TopOverdueCustomerDto(
                c.CustomerId, c.CustomerName, c.Overdue,
                totalOverdue > 0m
                    ? Math.Round(c.Overdue / totalOverdue * 100m, 2, MidpointRounding.ToEven)
                    : 0m))
            .ToList();

        var riskDistribution = new RiskDistributionDto(
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.High),
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.Medium),
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.Low),
            customerGroups.Where(c => c.Risk == CollectionRiskLevel.High).Sum(c => c.Total),
            customerGroups.Where(c => c.Risk == CollectionRiskLevel.Medium).Sum(c => c.Total),
            customerGroups.Where(c => c.Risk == CollectionRiskLevel.Low).Sum(c => c.Total));

        return new ConsolidatedDashboardDto(
            totalReceivable, totalOverdue, totalPending, overdueRatio,
            segments, topOverdue, riskDistribution);
    }

    public async Task<SegmentDashboardDto> GetSegmentDashboardAsync(
        int companyId,
        int segmentId,
        int? periodId = null,
        CancellationToken ct = default)
    {
        var invoicesQuery = BuildInvoicesQuery(companyId, periodId)
            .Where(i => i.Customer.SegmentId == segmentId);

        var invoices = await invoicesQuery
            .Select(i => new
            {
                i.CustomerId,
                CustomerName = i.Customer.Name,
                CustomerAccountNo = i.Customer.AccountNo,
                i.Amount,
                i.Status,
                i.DaysDiff
            })
            .ToListAsync(ct);

        var segmentName = await _db.Segments
            .Where(s => s.Id == segmentId)
            .Select(s => s.Name)
            .FirstOrDefaultAsync(ct) ?? "Unknown";

        var segmentTotal = invoices.Sum(i => i.Amount);
        var segmentOverdue = invoices
            .Where(i => i.Status == InvoiceCollectionStatus.Overdue)
            .Sum(i => i.Amount);
        var segmentPending = invoices
            .Where(i => i.Status == InvoiceCollectionStatus.Pending)
            .Sum(i => i.Amount);

        var customerGroups = invoices
            .GroupBy(i => new { i.CustomerId, i.CustomerName, i.CustomerAccountNo })
            .Select(g =>
            {
                var custOverdue = g.Where(x => x.Status == InvoiceCollectionStatus.Overdue).Sum(x => x.Amount);
                var custPending = g.Where(x => x.Status == InvoiceCollectionStatus.Pending).Sum(x => x.Amount);
                var custTotal = g.Sum(x => x.Amount);
                var avgDelay = g.Average(x => (double)x.DaysDiff);
                return new
                {
                    g.Key.CustomerId,
                    g.Key.CustomerName,
                    g.Key.CustomerAccountNo,
                    Total = custTotal,
                    Overdue = custOverdue,
                    Pending = custPending,
                    AvgDelay = avgDelay,
                    Risk = CalculateRisk(custOverdue, avgDelay),
                    OverdueRatio = custTotal > 0m
                        ? Math.Round(custOverdue / custTotal * 100m, 2, MidpointRounding.ToEven)
                        : 0m,
                    SharePercent = segmentTotal > 0m
                        ? Math.Round(custTotal / segmentTotal * 100m, 2, MidpointRounding.ToEven)
                        : 0m
                };
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        var customers = customerGroups
            .Select((c, index) => new CustomerCollectionRowDto(
                index + 1,
                c.CustomerId,
                c.CustomerName,
                c.CustomerAccountNo,
                c.Total,
                c.Overdue,
                c.Pending,
                c.OverdueRatio,
                c.SharePercent,
                c.Risk,
                c.AvgDelay))
            .ToList();

        var topOverdue = customerGroups
            .Where(c => c.Overdue > 0m)
            .OrderByDescending(c => c.Overdue)
            .Take(TOP_N_DEFAULT)
            .Select(c => new TopOverdueCustomerDto(
                c.CustomerId, c.CustomerName, c.Overdue,
                segmentOverdue > 0m
                    ? Math.Round(c.Overdue / segmentOverdue * 100m, 2, MidpointRounding.ToEven)
                    : 0m))
            .ToList();

        var topPending = customerGroups
            .Where(c => c.Pending > 0m)
            .OrderByDescending(c => c.Pending)
            .Take(TOP_N_DEFAULT)
            .Select(c => new TopOverdueCustomerDto(
                c.CustomerId, c.CustomerName, c.Pending,
                segmentPending > 0m
                    ? Math.Round(c.Pending / segmentPending * 100m, 2, MidpointRounding.ToEven)
                    : 0m))
            .ToList();

        var orderedByTotal = customerGroups.OrderByDescending(c => c.Total).ToList();
        var top5Total = orderedByTotal.Take(5).Sum(c => c.Total);
        var top10Total = orderedByTotal.Take(10).Sum(c => c.Total);
        var concentration = new ConcentrationDto(
            segmentTotal > 0m ? Math.Round(top5Total / segmentTotal * 100m, 2, MidpointRounding.ToEven) : 0m,
            segmentTotal > 0m ? Math.Round(top10Total / segmentTotal * 100m, 2, MidpointRounding.ToEven) : 0m);

        var summary = new SegmentSummaryDto(
            segmentId,
            segmentName,
            segmentTotal,
            segmentOverdue,
            segmentPending,
            segmentTotal > 0m
                ? Math.Round(segmentOverdue / segmentTotal * 100m, 2, MidpointRounding.ToEven)
                : 0m,
            customerGroups.Count,
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.High),
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.Medium),
            customerGroups.Count(c => c.Risk == CollectionRiskLevel.Low));

        return new SegmentDashboardDto(summary, customers, topOverdue, topPending, concentration);
    }

    public async Task<List<CustomerInvoiceDetailDto>> GetCustomerInvoicesAsync(
        int companyId,
        int customerId,
        int? periodId = null,
        CancellationToken ct = default)
    {
        var query = BuildInvoicesQuery(companyId, periodId)
            .Where(i => i.CustomerId == customerId);

        return await query
            .OrderBy(i => i.DueDate)
            .Select(i => new CustomerInvoiceDetailDto(
                i.InvoiceNo,
                i.TransactionDate,
                i.DueDate,
                i.DaysDiff,
                i.Amount,
                i.Note,
                i.Status.ToString()))
            .ToListAsync(ct);
    }

    private IQueryable<Core.Entities.CollectionInvoice> BuildInvoicesQuery(int companyId, int? periodId)
    {
        var query = _db.CollectionInvoices
            .Where(i => i.CompanyId == companyId);

        if (periodId.HasValue)
        {
            query = query.Where(i => i.ImportPeriodId == periodId.Value);
        }
        else
        {
            var latestPeriodIds = _db.ImportPeriods
                .Where(p => p.CompanyId == companyId && p.Status == ImportPeriodStatus.Completed)
                .GroupBy(p => p.SegmentId)
                .Select(g => g.OrderByDescending(p => p.ImportDate).First().Id);

            query = query.Where(i => latestPeriodIds.Contains(i.ImportPeriodId));
        }

        return query;
    }
}
