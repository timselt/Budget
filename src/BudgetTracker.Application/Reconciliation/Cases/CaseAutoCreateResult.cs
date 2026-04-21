namespace BudgetTracker.Application.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 4 — Case auto-creation özet sonucu.
/// <para>
/// <see cref="CreatedCaseIds"/>: üretilen Case'lerin primary key'leri.
/// <see cref="UnmatchedRowCount"/>: Customer.ExternalCustomerRef eşleşmeyen
/// ve Case'e dahil edilmeyen SourceRow sayısı (Task 8'de bucket UI'da gösterilir).
/// <see cref="TotalLinesCreated"/>: üretilen ReconciliationLine toplam sayısı.
/// <see cref="SkippedRowCount"/>: ParseStatus != Ok olduğu için atlanan satır
/// sayısı (Warning/Error — zaten kayıtlı, bilgi amaçlı).
/// </para>
/// </summary>
public sealed record CaseAutoCreateResult(
    IReadOnlyList<int> CreatedCaseIds,
    int UnmatchedRowCount,
    int TotalLinesCreated,
    int SkippedRowCount);
