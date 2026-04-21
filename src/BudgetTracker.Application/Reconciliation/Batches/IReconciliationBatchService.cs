using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Batches;

/// <summary>
/// Mutabakat batch CRUD + import orchestrator.
/// Pipeline: ImportAsync → parser → DB persist (Batch + SourceRow*N) →
/// audit event → BatchDetailDto döner.
/// Sprint 1 kapsamı:
/// <list type="bullet">
///   <item>ImportAsync (Draft + Parsed atomic; status Parsed olur)</item>
///   <item>ListAsync filtreli</item>
///   <item>GetByIdAsync</item>
///   <item>DeleteAsync sadece Draft (yarım kalan upload'lar için)</item>
/// </list>
/// ParseAsync (yeniden parse) Sprint 2'ye bırakılır — Sprint 1'de import
/// atomic.
/// </summary>
public interface IReconciliationBatchService
{
    /// <summary>
    /// Yeni batch import — hash kontrolü, parse, persist (Batch + SourceRows),
    /// audit. Duplicate hash ise <see cref="Import.DuplicateImportException"/>.
    /// </summary>
    Task<BatchDetailDto> ImportAsync(
        Stream fileStream,
        string fileName,
        ReconciliationFlow flow,
        string periodCode,
        ReconciliationSourceType sourceType,
        int companyId,
        int importedByUserId,
        string? notes,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BatchSummaryDto>> ListAsync(
        BatchListQuery query,
        int companyId,
        CancellationToken cancellationToken = default);

    Task<BatchDetailDto?> GetByIdAsync(
        int batchId,
        int companyId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sadece Draft durumundaki batch silinebilir. Parsed/Mapped/Archived
    /// için <see cref="InvalidOperationException"/>. Bulunamazsa false.
    /// </summary>
    Task<bool> DeleteDraftAsync(
        int batchId,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sprint 2 Task 8 — bir batch içindeki Customer eşleşmeyen unique
    /// external_customer_ref listesini döner. Sample döküman ref'leri
    /// UI'da "bu müşterini kaç satırı var" göstermek için.
    /// </summary>
    Task<IReadOnlyList<UnmatchedCustomerRefDto>> GetUnmatchedCustomersAsync(
        int batchId,
        int companyId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sprint 2 Task 8 — verilen Customer'ı external_ref'e bağla + autoCreator
    /// idempotent re-invoke et (yeni eşleşme varsa Case/Line üretir).
    /// </summary>
    Task<LinkUnmatchedCustomerResult> LinkUnmatchedCustomerAsync(
        int batchId,
        string externalCustomerRef,
        int targetCustomerId,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default);
}
