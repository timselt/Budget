using System.Globalization;
using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reconciliation.Cases;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 7 — Case + Line okuma/güncelleme servisi.
/// </summary>
public sealed class ReconciliationCaseService : IReconciliationCaseService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditLogger _audit;
    private readonly TimeProvider _time;

    public ReconciliationCaseService(
        IApplicationDbContext db,
        IAuditLogger audit,
        TimeProvider time)
    {
        _db = db;
        _audit = audit;
        _time = time;
    }

    public async Task<IReadOnlyList<CaseSummaryDto>> ListAsync(
        CaseListQuery query,
        int companyId,
        CancellationToken cancellationToken = default)
    {
        var cases = _db.ReconciliationCases.AsNoTracking()
            .Where(c => c.CompanyId == companyId);

        if (query.Flow is not null) cases = cases.Where(c => c.Flow == query.Flow);
        if (!string.IsNullOrWhiteSpace(query.PeriodCode))
            cases = cases.Where(c => c.PeriodCode == query.PeriodCode);
        if (query.Status is not null) cases = cases.Where(c => c.Status == query.Status);
        if (query.CustomerId is not null) cases = cases.Where(c => c.CustomerId == query.CustomerId);
        if (query.OwnerUserId is not null) cases = cases.Where(c => c.OwnerUserId == query.OwnerUserId);

        // BatchId filtresi Line → SourceRow → Batch zinciri üzerinden
        if (query.BatchId is not null)
        {
            var caseIdsFromBatch = _db.ReconciliationSourceRows.AsNoTracking()
                .Where(r => r.BatchId == query.BatchId)
                .Join(_db.ReconciliationLines.AsNoTracking(),
                    r => r.Id, l => l.SourceRowId, (r, l) => l.CaseId)
                .Distinct();
            cases = cases.Where(c => caseIdsFromBatch.Contains(c.Id));
        }

        // Join customer for display (code/name) + count lines + sum amount
        var query2 = from c in cases
                     join cust in _db.Customers.AsNoTracking() on c.CustomerId equals cust.Id
                     select new
                     {
                         c.Id, c.Flow, c.PeriodCode, c.CustomerId,
                         CustomerCode = cust.Code, CustomerName = cust.Name,
                         c.ContractId, c.Status, c.OwnerUserId, c.OpenedAt,
                         c.TotalAmount, c.CurrencyCode,
                         LineCount = _db.ReconciliationLines.AsNoTracking()
                             .Count(l => l.CaseId == c.Id),
                     };

        var rows = await query2
            .OrderByDescending(x => x.OpenedAt)
            .Take(500)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return rows.Select(x => new CaseSummaryDto(
            Id: x.Id, Flow: x.Flow, PeriodCode: x.PeriodCode,
            CustomerId: x.CustomerId, CustomerCode: x.CustomerCode, CustomerName: x.CustomerName,
            ContractId: x.ContractId, Status: x.Status, OwnerUserId: x.OwnerUserId,
            OpenedAt: x.OpenedAt, LineCount: x.LineCount,
            TotalAmount: x.TotalAmount, CurrencyCode: x.CurrencyCode)).ToList();
    }

    public async Task<CaseDetailDto?> GetByIdAsync(
        int caseId,
        int companyId,
        CancellationToken cancellationToken = default)
    {
        var kase = await _db.ReconciliationCases.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == caseId && c.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false);
        if (kase is null) return null;

        var customer = await _db.Customers.AsNoTracking()
            .Where(x => x.Id == kase.CustomerId)
            .Select(x => new { x.Code, x.Name })
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        var lines = await _db.ReconciliationLines.AsNoTracking()
            .Where(l => l.CaseId == caseId)
            .OrderBy(l => l.Id)
            .Select(l => new LineDto(
                l.Id, l.CaseId, l.SourceRowId,
                l.ProductCode, l.ProductName,
                l.Quantity, l.UnitPrice, l.Amount, l.CurrencyCode, l.PriceSourceRef,
                l.Status, l.DisputeReasonCode, l.DisputeNote))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new CaseDetailDto(
            Id: kase.Id, Flow: kase.Flow, PeriodCode: kase.PeriodCode,
            CustomerId: kase.CustomerId,
            CustomerCode: customer?.Code ?? string.Empty,
            CustomerName: customer?.Name ?? string.Empty,
            ContractId: kase.ContractId, Status: kase.Status,
            OwnerUserId: kase.OwnerUserId, OpenedAt: kase.OpenedAt,
            SentToCustomerAt: kase.SentToCustomerAt,
            CustomerResponseAt: kase.CustomerResponseAt,
            SentToAccountingAt: kase.SentToAccountingAt,
            TotalAmount: kase.TotalAmount, CurrencyCode: kase.CurrencyCode,
            Notes: kase.Notes, Lines: lines);
    }

    public async Task<CaseDetailDto> AssignOwnerAsync(
        int caseId, int newOwnerUserId, int companyId, int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var kase = await _db.ReconciliationCases
            .FirstOrDefaultAsync(c => c.Id == caseId && c.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"case {caseId} not found in company {companyId}");

        var previousOwner = kase.OwnerUserId;
        var now = _time.GetUtcNow();
        kase.AssignOwner(newOwnerUserId, now);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        await _audit.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.ReconciliationCase,
            EntityKey: caseId.ToString(CultureInfo.InvariantCulture),
            Action: AuditActions.ReconciliationCaseOwnershipChanged,
            CompanyId: companyId,
            UserId: actorUserId,
            OldValuesJson: JsonSerializer.Serialize(new { owner_user_id = previousOwner }),
            NewValuesJson: JsonSerializer.Serialize(new { owner_user_id = newOwnerUserId })),
            cancellationToken).ConfigureAwait(false);

        return (await GetByIdAsync(caseId, companyId, cancellationToken).ConfigureAwait(false))!;
    }

    public async Task<LineDto> UpdateLineAsync(
        int lineId, UpdateLineRequest request, int companyId, int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var line = await _db.ReconciliationLines
            .FirstOrDefaultAsync(l => l.Id == lineId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"line {lineId} not found");

        var kase = await _db.ReconciliationCases
            .FirstOrDefaultAsync(c => c.Id == line.CaseId && c.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"line {lineId} not in company {companyId}");

        var now = _time.GetUtcNow();
        line.UpdateQuantityAndPrice(request.Quantity, request.UnitPrice, now);

        // Case toplamını yeniden hesapla
        var newTotal = await _db.ReconciliationLines
            .Where(l => l.CaseId == kase.Id)
            .SumAsync(l => l.Amount, cancellationToken)
            .ConfigureAwait(false);
        kase.RecomputeTotalAmount(newTotal, now);

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new LineDto(
            line.Id, line.CaseId, line.SourceRowId,
            line.ProductCode, line.ProductName,
            line.Quantity, line.UnitPrice, line.Amount, line.CurrencyCode, line.PriceSourceRef,
            line.Status, line.DisputeReasonCode, line.DisputeNote);
    }

    public async Task<LineDto> MarkLineReadyAsync(
        int lineId, int companyId, int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var line = await _db.ReconciliationLines
            .FirstOrDefaultAsync(l => l.Id == lineId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"line {lineId} not found");

        var kase = await _db.ReconciliationCases
            .FirstOrDefaultAsync(c => c.Id == line.CaseId && c.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"line {lineId} not in company {companyId}");

        var now = _time.GetUtcNow();
        line.MarkReady(now);

        // Sprint 2 Task 12 — tüm line'lar Ready olduysa Case UnderControl → PricingMatched.
        // line şu an Ready'ye geçti, diğerleri DB'de kontrol edilir.
        var allReady = !await _db.ReconciliationLines.AsNoTracking()
            .AnyAsync(l => l.CaseId == line.CaseId
                && l.Id != line.Id
                && l.Status != ReconciliationLineStatus.Ready,
                cancellationToken)
            .ConfigureAwait(false);

        if (allReady && kase.Status == ReconciliationCaseStatus.UnderControl)
        {
            kase.MarkPricingMatched(true, now);
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new LineDto(
            line.Id, line.CaseId, line.SourceRowId,
            line.ProductCode, line.ProductName,
            line.Quantity, line.UnitPrice, line.Amount, line.CurrencyCode, line.PriceSourceRef,
            line.Status, line.DisputeReasonCode, line.DisputeNote);
    }
}
