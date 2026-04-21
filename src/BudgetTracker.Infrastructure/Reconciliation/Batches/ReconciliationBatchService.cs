using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reconciliation.Batches;
using BudgetTracker.Application.Reconciliation.Cases;
using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Reconciliation.Batches;

/// <summary>
/// Mutabakat batch service — parser orchestrator + DB persistence + audit.
/// Sprint 1 kapsamı (spec §3-6): import atomic (Batch + SourceRows tek
/// transaction), Draft sil, list/get filtreli.
/// </summary>
public sealed class ReconciliationBatchService : IReconciliationBatchService
{
    private readonly IApplicationDbContext _db;
    private readonly IReconciliationImportParser _parser;
    private readonly IAuditLogger _audit;
    private readonly TimeProvider _time;
    private readonly IReconciliationCaseAutoCreator _caseAutoCreator;

    public ReconciliationBatchService(
        IApplicationDbContext db,
        IReconciliationImportParser parser,
        IAuditLogger audit,
        TimeProvider time,
        IReconciliationCaseAutoCreator caseAutoCreator)
    {
        _db = db;
        _parser = parser;
        _audit = audit;
        _time = time;
        _caseAutoCreator = caseAutoCreator;
    }

    public async Task<BatchDetailDto> ImportAsync(
        Stream fileStream,
        string fileName,
        ReconciliationFlow flow,
        string periodCode,
        ReconciliationSourceType sourceType,
        int companyId,
        int importedByUserId,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(fileStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);

        // Parse — hash + her satır validate. ParsedBatchResult.SourceFileHash
        // duplicate kontrolü için kullanılır.
        var parsed = await _parser.ParseAsync(fileStream, fileName, flow, cancellationToken)
            .ConfigureAwait(false);

        // Duplicate import koruması — (company_id, source_file_hash) unique.
        // Service seviyesinde explicit kontrol; DB constraint yedek katman.
        var existing = await _db.ReconciliationBatches
            .Where(b => b.CompanyId == companyId && b.SourceFileHash == parsed.SourceFileHash)
            .Select(b => (int?)b.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            throw new DuplicateImportException(parsed.SourceFileHash, existing.Value);
        }

        var now = _time.GetUtcNow();

        var batch = ReconciliationBatch.Create(
            companyId: companyId,
            flow: flow,
            periodCode: periodCode,
            sourceType: sourceType,
            sourceFileName: fileName,
            sourceFileHash: parsed.SourceFileHash,
            importedByUserId: importedByUserId,
            importedAt: now,
            notes: notes);

        _db.ReconciliationBatches.Add(batch);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // SourceRow'lar — her satır parse_status ile birlikte. Hatalı satırlar
        // batch'i düşürmez (spec §6.3); Error satırı kayıtlı kalır, agent
        // UI'da inceler.
        var rowNumber = 1;
        foreach (var validated in parsed.Rows)
        {
            var sourceRow = validated.Status switch
            {
                ReconciliationParseStatus.Ok => ReconciliationSourceRow.CreateOk(
                    batch.Id, validated.ExternalCustomerRef, validated.ExternalDocumentRef,
                    validated.RawPayloadJson, rowNumber, now),
                ReconciliationParseStatus.Warning => ReconciliationSourceRow.CreateWarning(
                    batch.Id, validated.ExternalCustomerRef, validated.ExternalDocumentRef,
                    validated.RawPayloadJson, rowNumber, now,
                    validated.ParseErrorsJson ?? "[]"),
                ReconciliationParseStatus.Error => ReconciliationSourceRow.CreateError(
                    batch.Id, validated.ExternalCustomerRef, validated.ExternalDocumentRef,
                    validated.RawPayloadJson, rowNumber, now,
                    validated.ParseErrorsJson ?? "[]"),
                _ => throw new InvalidOperationException(
                    $"unknown parse status: {validated.Status}"),
            };
            _db.ReconciliationSourceRows.Add(sourceRow);
            rowNumber++;
        }

        // Batch durumunu Parsed'a geçir + RowCount güncelle.
        batch.MarkParsed(parsed.TotalRows, importedByUserId, now);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Sprint 2 Task 4 — parse sonrası Case/Line atomic üretimi.
        // Ok satırlar customer_id'ye göre gruplanıp Case + Line'lara dönüşür.
        // Customer eşleşmeyen satırlar Task 8 bucket endpoint'iyle sorgulanır.
        var autoCreateResult = await _caseAutoCreator
            .CreateCasesForBatchAsync(batch.Id, companyId, importedByUserId, cancellationToken)
            .ConfigureAwait(false);

        // Audit (spec gereği). Context: flow, period_code, row_count, hash,
        // truncation, parse istatistikleri + Sprint 2 case summary.
        var auditContext = JsonSerializer.Serialize(new
        {
            flow = flow.ToString(),
            period_code = periodCode,
            source_type = sourceType.ToString(),
            row_count = parsed.TotalRows,
            ok_rows = parsed.OkRows,
            warning_rows = parsed.WarningRows,
            error_rows = parsed.ErrorRows,
            source_file_hash = parsed.SourceFileHash,
            source_file_name = fileName,
            truncated = parsed.Truncated,
            cases_created = autoCreateResult.CreatedCaseIds.Count,
            lines_created = autoCreateResult.TotalLinesCreated,
            unmatched_rows = autoCreateResult.UnmatchedRowCount,
        });
        await _audit.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.ReconciliationBatch,
            EntityKey: batch.Id.ToString(System.Globalization.CultureInfo.InvariantCulture),
            Action: AuditActions.ReconciliationBatchImported,
            CompanyId: companyId,
            UserId: importedByUserId,
            NewValuesJson: auditContext), cancellationToken).ConfigureAwait(false);

        return ToDetail(batch, parsed.OkRows, parsed.WarningRows, parsed.ErrorRows, parsed.Truncated);
    }

    public async Task<IReadOnlyList<BatchSummaryDto>> ListAsync(
        BatchListQuery query,
        int companyId,
        CancellationToken cancellationToken = default)
    {
        var q = _db.ReconciliationBatches.AsNoTracking()
            .Where(b => b.CompanyId == companyId);

        if (query.Flow is not null) q = q.Where(b => b.Flow == query.Flow);
        if (!string.IsNullOrWhiteSpace(query.PeriodCode))
            q = q.Where(b => b.PeriodCode == query.PeriodCode);
        if (query.Status is not null) q = q.Where(b => b.Status == query.Status);

        var rows = await q
            .OrderByDescending(b => b.ImportedAt)
            .Take(500)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return rows.Select(b => new BatchSummaryDto(
            Id: b.Id,
            Flow: b.Flow.ToString(),
            PeriodCode: b.PeriodCode,
            SourceType: b.SourceType.ToString(),
            SourceFileName: b.SourceFileName,
            RowCount: b.RowCount,
            Status: b.Status.ToString(),
            ImportedAt: b.ImportedAt,
            ImportedByUserId: b.ImportedByUserId,
            Notes: b.Notes)).ToList();
    }

    public async Task<BatchDetailDto?> GetByIdAsync(
        int batchId,
        int companyId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _db.ReconciliationBatches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId && b.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false);
        if (batch is null) return null;

        // Parse istatistiklerini SourceRow'lardan toplu çek.
        var stats = await _db.ReconciliationSourceRows.AsNoTracking()
            .Where(r => r.BatchId == batchId)
            .GroupBy(r => r.ParseStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var ok = stats.FirstOrDefault(s => s.Status == ReconciliationParseStatus.Ok)?.Count ?? 0;
        var warning = stats.FirstOrDefault(s => s.Status == ReconciliationParseStatus.Warning)?.Count ?? 0;
        var error = stats.FirstOrDefault(s => s.Status == ReconciliationParseStatus.Error)?.Count ?? 0;

        return ToDetail(batch, ok, warning, error, Truncated: false);
    }

    public async Task<bool> DeleteDraftAsync(
        int batchId,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _db.ReconciliationBatches
            .FirstOrDefaultAsync(b => b.Id == batchId && b.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false);
        if (batch is null) return false;

        if (batch.Status != ReconciliationBatchStatus.Draft)
            throw new InvalidOperationException(
                $"only Draft batch can be deleted (current: {batch.Status}).");

        // Soft delete — append-only audit ile uyumlu (kayıt korunur).
        var now = _time.GetUtcNow();
        batch.MarkDeleted(actorUserId, now);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<IReadOnlyList<UnmatchedCustomerRefDto>> GetUnmatchedCustomersAsync(
        int batchId, int companyId, CancellationToken cancellationToken = default)
    {
        // Bu batch'e ait tüm external_customer_ref'leri + customer match durumlarıyla çek.
        var rows = await _db.ReconciliationSourceRows.AsNoTracking()
            .Where(r => r.BatchId == batchId && r.ParseStatus == ReconciliationParseStatus.Ok)
            .Select(r => new { r.ExternalCustomerRef, r.ExternalDocumentRef })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rows.Count == 0) return Array.Empty<UnmatchedCustomerRefDto>();

        var uniqueRefs = rows
            .Select(r => r.ExternalCustomerRef)
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct()
            .ToList();

        var matchedRefs = await _db.Customers.AsNoTracking()
            .Where(c => c.CompanyId == companyId
                && c.ExternalCustomerRef != null
                && uniqueRefs.Contains(c.ExternalCustomerRef))
            .Select(c => c.ExternalCustomerRef!)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var matchedSet = new HashSet<string>(matchedRefs, StringComparer.OrdinalIgnoreCase);

        return rows
            .Where(r => !matchedSet.Contains(r.ExternalCustomerRef ?? string.Empty))
            .GroupBy(r => r.ExternalCustomerRef)
            .Select(g => new UnmatchedCustomerRefDto(
                ExternalCustomerRef: g.Key ?? string.Empty,
                RowCount: g.Count(),
                SampleDocumentRefs: g
                    .Select(r => r.ExternalDocumentRef ?? string.Empty)
                    .Where(s => !string.IsNullOrEmpty(s))
                    .Distinct()
                    .Take(5)
                    .ToList()))
            .OrderByDescending(d => d.RowCount)
            .ToList();
    }

    public async Task<LinkUnmatchedCustomerResult> LinkUnmatchedCustomerAsync(
        int batchId, string externalCustomerRef, int targetCustomerId,
        int companyId, int actorUserId,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(externalCustomerRef);

        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.Id == targetCustomerId && c.CompanyId == companyId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException(
                $"customer {targetCustomerId} not found in company {companyId}");

        var now = _time.GetUtcNow();

        // Customer'ı external_ref'e bağla (00a LinkExternalRef domain metodu).
        // Eğer customer zaten farklı bir ref'e sahipse override eder — operasyonel
        // düzeltme senaryosu beklenen davranış.
        customer.LinkExternalRef(externalCustomerRef, "LOGO", actorUserId, now);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // AutoCreator idempotent re-invoke — yeni eşleşme üzerinden Case/Line üretir.
        var retryResult = await _caseAutoCreator
            .CreateCasesForBatchAsync(batchId, companyId, actorUserId, cancellationToken)
            .ConfigureAwait(false);

        return new LinkUnmatchedCustomerResult(
            CustomerId: targetCustomerId,
            ExternalCustomerRef: externalCustomerRef,
            NewCasesCreated: retryResult.CreatedCaseIds.Count,
            NewLinesCreated: retryResult.TotalLinesCreated);
    }

    private static BatchDetailDto ToDetail(
        ReconciliationBatch batch,
        int okCount, int warningCount, int errorCount, bool Truncated)
        => new(
            Id: batch.Id,
            Flow: batch.Flow.ToString(),
            PeriodCode: batch.PeriodCode,
            SourceType: batch.SourceType.ToString(),
            SourceFileName: batch.SourceFileName,
            SourceFileHash: batch.SourceFileHash,
            RowCount: batch.RowCount,
            OkCount: okCount,
            WarningCount: warningCount,
            ErrorCount: errorCount,
            Truncated: Truncated,
            Status: batch.Status.ToString(),
            ImportedAt: batch.ImportedAt,
            ImportedByUserId: batch.ImportedByUserId,
            Notes: batch.Notes);
}
