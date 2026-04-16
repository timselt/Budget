using BudgetTracker.Application.Collections;
using BudgetTracker.Application.Collections.Dtos;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CollectionQueryService : ICollectionQueryService
{
    private readonly IApplicationDbContext _db;

    public CollectionQueryService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<ImportPeriodDto>> GetPeriodsAsync(
        int companyId,
        int? segmentId = null,
        CancellationToken ct = default)
    {
        var query = _db.ImportPeriods
            .Where(p => p.CompanyId == companyId);

        if (segmentId.HasValue)
        {
            query = query.Where(p => p.SegmentId == segmentId.Value);
        }

        return await query
            .OrderByDescending(p => p.ImportDate)
            .Select(p => new ImportPeriodDto(
                p.Id,
                p.SegmentId,
                p.Segment.Name,
                p.ImportDate,
                p.FileName,
                p.PeriodLabel,
                p.TotalAmount,
                p.OverdueAmount,
                p.PendingAmount,
                p.Status.ToString()))
            .ToListAsync(ct);
    }

    public async Task<List<TopOverdueCustomerDto>> GetTopOverdueAsync(
        int companyId,
        int n = 10,
        int? periodId = null,
        CancellationToken ct = default)
    {
        var invoicesQuery = _db.CollectionInvoices
            .Where(i => i.CompanyId == companyId && i.Status == InvoiceCollectionStatus.Overdue);

        if (periodId.HasValue)
        {
            invoicesQuery = invoicesQuery.Where(i => i.ImportPeriodId == periodId.Value);
        }
        else
        {
            var latestPeriodIds = _db.ImportPeriods
                .Where(p => p.CompanyId == companyId && p.Status == ImportPeriodStatus.Completed)
                .GroupBy(p => p.SegmentId)
                .Select(g => g.OrderByDescending(p => p.ImportDate).First().Id);

            invoicesQuery = invoicesQuery.Where(i => latestPeriodIds.Contains(i.ImportPeriodId));
        }

        var totalOverdue = await invoicesQuery.SumAsync(i => i.Amount, ct);

        return await invoicesQuery
            .GroupBy(i => new { i.CustomerId, i.Customer.Name })
            .Select(g => new
            {
                g.Key.CustomerId,
                CustomerName = g.Key.Name,
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .Take(n)
            .Select(x => new TopOverdueCustomerDto(
                x.CustomerId,
                x.CustomerName,
                x.Amount,
                totalOverdue > 0m
                    ? Math.Round(x.Amount / totalOverdue * 100m, 2, MidpointRounding.ToEven)
                    : 0m))
            .ToListAsync(ct);
    }
}
