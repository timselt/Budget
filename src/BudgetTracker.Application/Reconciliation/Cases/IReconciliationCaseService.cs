namespace BudgetTracker.Application.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 7 — Case CRUD + aksiyon servisi.
/// Controller (ReconciliationCasesController) ve ilerde S4/S5/S6 UI bu interface'i kullanır.
/// </summary>
public interface IReconciliationCaseService
{
    Task<IReadOnlyList<CaseSummaryDto>> ListAsync(
        CaseListQuery query,
        int companyId,
        CancellationToken cancellationToken = default);

    Task<CaseDetailDto?> GetByIdAsync(
        int caseId,
        int companyId,
        CancellationToken cancellationToken = default);

    Task<CaseDetailDto> AssignOwnerAsync(
        int caseId,
        int newOwnerUserId,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Line inline edit: quantity ve/veya unit_price değiştirir. Domain
    /// kuralı: sadece PendingReview veya PricingMismatch line'larda izin verilir.
    /// </summary>
    Task<LineDto> UpdateLineAsync(
        int lineId,
        UpdateLineRequest request,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// PricingMismatch line → Ready (manuel karar: agent contract price'ını onayladı).
    /// </summary>
    Task<LineDto> MarkLineReadyAsync(
        int lineId,
        int companyId,
        int actorUserId,
        CancellationToken cancellationToken = default);
}
