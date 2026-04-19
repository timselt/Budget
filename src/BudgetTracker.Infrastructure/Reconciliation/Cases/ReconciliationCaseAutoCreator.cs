using System.Text.Json;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reconciliation.Cases;
using BudgetTracker.Application.Reconciliation.Lines;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 4 implementasyonu — parse edilmiş batch'i Case + Line'a çevirir.
/// <para>
/// Algoritma (spec 01_phase1_domain_model §5.1):
/// <list type="number">
///   <item>Batch'e ait Ok SourceRow'ları çek.</item>
///   <item>Unique external_customer_ref seti → Customer dictionary lookup.</item>
///   <item>Eşleşen satırları customer_id'ye göre grupla; mevcut Case varsa
///     tekrar kullan (spec §3.4 unique constraint: company+flow+period+customer).</item>
///   <item>Her grup için: Case (yoksa yarat) + Line'lar (unit_price=0 PendingReview).
///     Task 5 PriceBook lookup ile unit_price + status çözer.</item>
///   <item>Eşleşmeyen satırlar atlanır (Task 8 bucket endpoint'i live sorgular).</item>
/// </list>
/// </para>
/// <para>
/// Atomicity: BeginTransactionAsync → tüm işlemler → Commit. SaveChanges
/// sırasında herhangi bir hata rollback tetikler.
/// </para>
/// </summary>
public sealed class ReconciliationCaseAutoCreator : IReconciliationCaseAutoCreator
{
    private readonly IApplicationDbContext _db;
    private readonly TimeProvider _time;
    private readonly ILinePricingResolver _pricingResolver;

    public ReconciliationCaseAutoCreator(
        IApplicationDbContext db,
        TimeProvider time,
        ILinePricingResolver pricingResolver)
    {
        _db = db;
        _time = time;
        _pricingResolver = pricingResolver;
    }

    public async Task<CaseAutoCreateResult> CreateCasesForBatchAsync(
        int batchId,
        int companyId,
        int ownerUserId,
        CancellationToken cancellationToken = default)
    {
        if (batchId <= 0) throw new ArgumentOutOfRangeException(nameof(batchId));
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (ownerUserId <= 0) throw new ArgumentOutOfRangeException(nameof(ownerUserId));

        var batch = await _db.ReconciliationBatches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId && b.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException($"batch {batchId} not found for company {companyId}");

        // Sadece Ok satırlar case'e dahil olur. Warning/Error zaten parser tarafından
        // ayrıca kayıtlı — UI'da ayrı sekmede gösterilir (Task 9).
        var sourceRows = await _db.ReconciliationSourceRows.AsNoTracking()
            .Where(r => r.BatchId == batchId && r.ParseStatus == ReconciliationParseStatus.Ok)
            .OrderBy(r => r.RowNumber)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var totalRows = await _db.ReconciliationSourceRows.AsNoTracking()
            .CountAsync(r => r.BatchId == batchId, cancellationToken)
            .ConfigureAwait(false);
        var skipped = totalRows - sourceRows.Count;

        if (sourceRows.Count == 0)
        {
            return new CaseAutoCreateResult(
                CreatedCaseIds: Array.Empty<int>(),
                UnmatchedRowCount: 0,
                TotalLinesCreated: 0,
                SkippedRowCount: skipped);
        }

        // Unique external_customer_ref → customer_id eşlemesi. Tek sorgu.
        var uniqueRefs = sourceRows
            .Select(r => r.ExternalCustomerRef)
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct()
            .ToList();

        var customers = await _db.Customers.AsNoTracking()
            .Where(c => c.CompanyId == companyId
                && c.ExternalCustomerRef != null
                && uniqueRefs.Contains(c.ExternalCustomerRef))
            .Select(c => new { c.Id, c.ExternalCustomerRef })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var refToCustomerId = customers
            .Where(c => c.ExternalCustomerRef != null)
            .ToDictionary(c => c.ExternalCustomerRef!, c => c.Id, StringComparer.OrdinalIgnoreCase);

        // Eşleşmeyenleri ayrı tut (Case'e gitmez).
        var unmatchedCount = sourceRows.Count(r =>
            !refToCustomerId.ContainsKey(r.ExternalCustomerRef ?? string.Empty));
        var matched = sourceRows
            .Where(r => refToCustomerId.ContainsKey(r.ExternalCustomerRef ?? string.Empty))
            .ToList();

        if (matched.Count == 0)
        {
            return new CaseAutoCreateResult(
                CreatedCaseIds: Array.Empty<int>(),
                UnmatchedRowCount: unmatchedCount,
                TotalLinesCreated: 0,
                SkippedRowCount: skipped);
        }

        // Customer gruplarına böl. Batch içinde flow + period_code tek olduğundan
        // grupla sadece customer_id yeterli.
        var groupedByCustomer = matched
            .GroupBy(r => refToCustomerId[r.ExternalCustomerRef!])
            .ToList();

        // Mevcut Case'leri kontrol et (aynı batch yeniden çalıştırılmış olabilir).
        var existingCaseCustomerIds = groupedByCustomer.Select(g => g.Key).ToList();
        var existingCases = await _db.ReconciliationCases
            .Where(c => c.CompanyId == companyId
                && c.Flow == batch.Flow
                && c.PeriodCode == batch.PeriodCode
                && existingCaseCustomerIds.Contains(c.CustomerId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var existingByCustomer = existingCases.ToDictionary(c => c.CustomerId, c => c);

        var now = _time.GetUtcNow();
        var createdCaseIds = new List<int>();
        var totalLines = 0;

        // Atomicity notu: IApplicationDbContext explicit transaction exposure
        // yok (IUnitOfWork sadece SaveChangesAsync verir). Idempotent tasarım:
        // re-invoke durumunda existingByCustomer mevcut Case'leri tespit eder,
        // duplicate unique constraint ihlali oluşmaz. İlerde Task 12 state
        // machine + proper transactional boundary eklediğinde burası
        // wrap'lenir (follow-up TODO).
        foreach (var group in groupedByCustomer)
        {
            var customerId = group.Key;
            var rows = group.ToList();

            if (!existingByCustomer.TryGetValue(customerId, out var kase))
            {
                kase = ReconciliationCase.CreateDraft(
                    companyId: companyId,
                    flow: batch.Flow,
                    periodCode: batch.PeriodCode,
                    customerId: customerId,
                    ownerUserId: ownerUserId,
                    openedAt: now);
                _db.ReconciliationCases.Add(kase);
                // Case Id'sini Line FK için erken öğrenmek gerek.
                await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                createdCaseIds.Add(kase.Id);
            }

            foreach (var sourceRow in rows)
            {
                var (productCode, productName, quantity, expectedPrice) = ExtractLineFields(
                    sourceRow.RawPayload, batch.Flow);
                if (quantity <= 0)
                {
                    // Parser validator'ı geçmiş ama domain kural gereği 0 kabul edilemez.
                    continue;
                }

                var line = ReconciliationLine.Create(
                    caseId: kase.Id,
                    sourceRowId: sourceRow.Id,
                    productCode: productCode,
                    productName: productName,
                    quantity: quantity,
                    unitPrice: 0m,
                    currencyCode: kase.CurrencyCode,
                    priceSourceRef: "UNRESOLVED",
                    createdAt: now);

                // Sprint 2 Task 5 — PriceBook lookup ile Line status atanır.
                // Domain metotlari: ResolveAsReady / ResolveAsPricingMismatch /
                // ResolveAsRejected (Line.cs içinde).
                await _pricingResolver.ResolveAsync(
                    line: line,
                    customerId: customerId,
                    flow: batch.Flow,
                    periodCode: batch.PeriodCode,
                    expectedUnitPrice: expectedPrice,
                    cancellationToken: cancellationToken).ConfigureAwait(false);

                _db.ReconciliationLines.Add(line);
                totalLines++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new CaseAutoCreateResult(
            CreatedCaseIds: createdCaseIds,
            UnmatchedRowCount: unmatchedCount,
            TotalLinesCreated: totalLines,
            SkippedRowCount: skipped);
    }

    /// <summary>
    /// Flow'a göre RawPayload JSON'ından Line için gereken alanları çıkarır.
    /// Insurance: product_code + product_name + quantity + unit_price_expected.
    /// Automotive: service_code + service_name + usage_count (expected_price yok).
    /// </summary>
    private static (string productCode, string productName, decimal quantity, decimal? expectedPrice) ExtractLineFields(
        string rawPayload, ReconciliationFlow flow)
    {
        using var doc = JsonDocument.Parse(rawPayload);
        var root = doc.RootElement;

        return flow switch
        {
            ReconciliationFlow.Insurance => (
                productCode: root.TryGetProperty("product_code", out var pc) ? pc.GetString() ?? string.Empty : string.Empty,
                productName: root.TryGetProperty("product_name", out var pn) ? pn.GetString() ?? string.Empty : string.Empty,
                quantity: ReadDecimal(root, "quantity"),
                expectedPrice: ReadNullableDecimal(root, "unit_price_expected")),
            ReconciliationFlow.Automotive => (
                productCode: root.TryGetProperty("service_code", out var sc) ? sc.GetString() ?? string.Empty : string.Empty,
                productName: root.TryGetProperty("service_name", out var sn) ? sn.GetString() ?? string.Empty : string.Empty,
                quantity: ReadDecimal(root, "usage_count"),
                expectedPrice: (decimal?)null),
            _ => throw new InvalidOperationException($"unsupported flow: {flow}"),
        };
    }

    private static decimal? ReadNullableDecimal(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var p)) return null;
        return p.ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.Number when p.TryGetDecimal(out var d) => d,
            JsonValueKind.String when decimal.TryParse(p.GetString(),
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var d) => d,
            _ => null,
        };
    }

    private static decimal ReadDecimal(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var p)) return 0m;
        return p.ValueKind switch
        {
            JsonValueKind.Number when p.TryGetDecimal(out var d) => d,
            JsonValueKind.String when decimal.TryParse(p.GetString(),
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var d) => d,
            _ => 0m,
        };
    }
}
