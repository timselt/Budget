using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Ham veri (Faz 1 spec §3.3) — değiştirilmez, audit kaynağı. Parser bu satırı
/// jsonb payload + parse_status + opsiyonel parse_errors ile yazar. Hatalı
/// satırlar parse_status=Error ile kalır, batch reddedilmez.
/// </summary>
public sealed class ReconciliationSourceRow : BaseEntity
{
    public int BatchId { get; private set; }

    /// <summary>Sigorta: Logo kodu, otomotiv: bayi/dealer kodu.</summary>
    public string ExternalCustomerRef { get; private set; } = string.Empty;

    /// <summary>Sigorta: policy_no, otomotiv: case_ref.</summary>
    public string? ExternalDocumentRef { get; private set; }

    /// <summary>Source dosyadan ham JSON (kolon adları normalize edilmiş).</summary>
    public string RawPayload { get; private set; } = "{}";

    /// <summary>1-based; başlık satırı dahil edilmez.</summary>
    public int RowNumber { get; private set; }

    public DateTimeOffset ParsedAt { get; private set; }
    public ReconciliationParseStatus ParseStatus { get; private set; }

    /// <summary>jsonb — code/message/field listesi. Ok satırlarda null.</summary>
    public string? ParseErrors { get; private set; }

    private ReconciliationSourceRow() { }

    public static ReconciliationSourceRow CreateOk(
        int batchId,
        string externalCustomerRef,
        string? externalDocumentRef,
        string rawPayload,
        int rowNumber,
        DateTimeOffset parsedAt)
        => Create(batchId, externalCustomerRef, externalDocumentRef, rawPayload,
            rowNumber, parsedAt, ReconciliationParseStatus.Ok, parseErrors: null);

    public static ReconciliationSourceRow CreateWarning(
        int batchId,
        string externalCustomerRef,
        string? externalDocumentRef,
        string rawPayload,
        int rowNumber,
        DateTimeOffset parsedAt,
        string parseErrors)
        => Create(batchId, externalCustomerRef, externalDocumentRef, rawPayload,
            rowNumber, parsedAt, ReconciliationParseStatus.Warning, parseErrors);

    public static ReconciliationSourceRow CreateError(
        int batchId,
        string externalCustomerRef,
        string? externalDocumentRef,
        string rawPayload,
        int rowNumber,
        DateTimeOffset parsedAt,
        string parseErrors)
        => Create(batchId, externalCustomerRef, externalDocumentRef, rawPayload,
            rowNumber, parsedAt, ReconciliationParseStatus.Error, parseErrors);

    private static ReconciliationSourceRow Create(
        int batchId,
        string externalCustomerRef,
        string? externalDocumentRef,
        string rawPayload,
        int rowNumber,
        DateTimeOffset parsedAt,
        ReconciliationParseStatus status,
        string? parseErrors)
    {
        if (batchId <= 0) throw new ArgumentOutOfRangeException(nameof(batchId));
        if (rowNumber <= 0) throw new ArgumentOutOfRangeException(nameof(rowNumber));
        ArgumentNullException.ThrowIfNull(rawPayload);
        if (status != ReconciliationParseStatus.Ok && string.IsNullOrEmpty(parseErrors))
            throw new ArgumentException(
                "parse_errors required for Warning/Error", nameof(parseErrors));

        return new ReconciliationSourceRow
        {
            BatchId = batchId,
            ExternalCustomerRef = externalCustomerRef ?? string.Empty,
            ExternalDocumentRef = externalDocumentRef,
            RawPayload = rawPayload,
            RowNumber = rowNumber,
            ParsedAt = parsedAt,
            ParseStatus = status,
            ParseErrors = parseErrors,
            CreatedAt = parsedAt,
        };
    }
}
