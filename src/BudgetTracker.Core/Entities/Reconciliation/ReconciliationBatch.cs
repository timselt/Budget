using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Mutabakat batch — kaynak dosyadan yapılan tek import (Faz 1 spec §3.2).
/// Source dosya ham olarak saklanmaz; SHA-256 hash ile duplicate import
/// engellenir. Parser SourceRow'ları çıkardıktan sonra Status=Parsed olur.
/// </summary>
public sealed class ReconciliationBatch : TenantEntity
{
    private readonly List<ReconciliationSourceRow> _sourceRows = new();

    public ReconciliationFlow Flow { get; private set; }

    /// <summary>YYYY-MM (7 char). Validation: format + zaman dilimi.</summary>
    public string PeriodCode { get; private set; } = string.Empty;

    public ReconciliationSourceType SourceType { get; private set; }
    public string SourceFileName { get; private set; } = string.Empty;

    /// <summary>SHA-256 hex (64 char). Duplicate import koruması.</summary>
    public string SourceFileHash { get; private set; } = string.Empty;

    public int RowCount { get; private set; }
    public int ImportedByUserId { get; private set; }
    public DateTimeOffset ImportedAt { get; private set; }
    public ReconciliationBatchStatus Status { get; private set; }
    public string? Notes { get; private set; }

    public IReadOnlyCollection<ReconciliationSourceRow> SourceRows => _sourceRows;

    private ReconciliationBatch() { }

    /// <summary>
    /// Yeni Draft batch oluşturur. Parser çağrılmadan önce çağrılır.
    /// RowCount başlangıçta 0; parser tamamlanınca <see cref="MarkParsed"/>
    /// ile gerçek değer + Status güncellenir.
    /// </summary>
    public static ReconciliationBatch Create(
        int companyId,
        ReconciliationFlow flow,
        string periodCode,
        ReconciliationSourceType sourceType,
        string sourceFileName,
        string sourceFileHash,
        int importedByUserId,
        DateTimeOffset importedAt,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (string.IsNullOrWhiteSpace(periodCode))
            throw new ArgumentException("period_code required", nameof(periodCode));
        if (periodCode.Length != 7 || periodCode[4] != '-')
            throw new ArgumentException("period_code must be YYYY-MM", nameof(periodCode));
        if (string.IsNullOrWhiteSpace(sourceFileName))
            throw new ArgumentException("source_file_name required", nameof(sourceFileName));
        if (string.IsNullOrWhiteSpace(sourceFileHash) || sourceFileHash.Length != 64)
            throw new ArgumentException("source_file_hash must be SHA-256 hex (64 char)", nameof(sourceFileHash));
        if (importedByUserId <= 0) throw new ArgumentOutOfRangeException(nameof(importedByUserId));

        var batch = new ReconciliationBatch
        {
            Flow = flow,
            PeriodCode = periodCode,
            SourceType = sourceType,
            SourceFileName = sourceFileName,
            SourceFileHash = sourceFileHash,
            RowCount = 0,
            ImportedByUserId = importedByUserId,
            ImportedAt = importedAt,
            Status = ReconciliationBatchStatus.Draft,
            Notes = notes,
            CreatedAt = importedAt,
            CreatedByUserId = importedByUserId,
        };
        batch.CompanyId = companyId;
        return batch;
    }

    /// <summary>Parser tamamlandı — Draft → Parsed, RowCount güncellenir.</summary>
    public void MarkParsed(int rowCount, int actorUserId, DateTimeOffset parsedAt)
    {
        if (Status != ReconciliationBatchStatus.Draft)
            throw new InvalidOperationException(
                $"only Draft batch can be marked Parsed (current: {Status}).");
        if (rowCount < 0) throw new ArgumentOutOfRangeException(nameof(rowCount));
        Status = ReconciliationBatchStatus.Parsed;
        RowCount = rowCount;
        UpdatedAt = parsedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>Sprint 2: Parsed → Mapped (case'lere dağıtıldı).</summary>
    public void MarkMapped(int actorUserId, DateTimeOffset mappedAt)
    {
        if (Status != ReconciliationBatchStatus.Parsed)
            throw new InvalidOperationException(
                $"only Parsed batch can be marked Mapped (current: {Status}).");
        Status = ReconciliationBatchStatus.Mapped;
        UpdatedAt = mappedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>Sprint 4: tüm case'ler kapanınca Archived.</summary>
    public void Archive(int actorUserId, DateTimeOffset archivedAt)
    {
        if (Status != ReconciliationBatchStatus.Mapped)
            throw new InvalidOperationException(
                $"only Mapped batch can be Archived (current: {Status}).");
        Status = ReconciliationBatchStatus.Archived;
        UpdatedAt = archivedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>SourceRow ekleme — sadece Draft / Parsed durumlarında.</summary>
    public void AddSourceRow(ReconciliationSourceRow row)
    {
        if (Status is ReconciliationBatchStatus.Mapped or ReconciliationBatchStatus.Archived)
            throw new InvalidOperationException(
                $"cannot add source rows when batch is {Status}.");
        ArgumentNullException.ThrowIfNull(row);
        _sourceRows.Add(row);
    }

    public void UpdateNotes(string? notes, int actorUserId, DateTimeOffset updatedAt)
    {
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
