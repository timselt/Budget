using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reconciliation.Batches;
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

    public ReconciliationBatchService(
        IApplicationDbContext db,
        IReconciliationImportParser parser,
        IAuditLogger audit,
        TimeProvider time)
    {
        _db = db;
        _parser = parser;
        _audit = audit;
        _time = time;
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

        // Audit (spec gereği). Context: flow, period_code, row_count, hash,
        // truncation, parse istatistikleri.
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
            Flow: b.Flow,
            PeriodCode: b.PeriodCode,
            SourceType: b.SourceType,
            SourceFileName: b.SourceFileName,
            RowCount: b.RowCount,
            Status: b.Status,
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

    private static BatchDetailDto ToDetail(
        ReconciliationBatch batch,
        int okCount, int warningCount, int errorCount, bool Truncated)
        => new(
            Id: batch.Id,
            Flow: batch.Flow,
            PeriodCode: batch.PeriodCode,
            SourceType: batch.SourceType,
            SourceFileName: batch.SourceFileName,
            SourceFileHash: batch.SourceFileHash,
            RowCount: batch.RowCount,
            OkCount: okCount,
            WarningCount: warningCount,
            ErrorCount: errorCount,
            Truncated: Truncated,
            Status: batch.Status,
            ImportedAt: batch.ImportedAt,
            ImportedByUserId: batch.ImportedByUserId,
            Notes: batch.Notes);
}
