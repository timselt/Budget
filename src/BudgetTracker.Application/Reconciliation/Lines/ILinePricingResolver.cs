using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Lines;

/// <summary>
/// Sprint 2 Task 5 — ReconciliationLine'ları PriceBook lookup ile çözer.
/// <para>
/// Girdi: PendingReview line + Case context (customer_id + flow + period + expected price).
/// Çıktı: line status atanır (Ready / PricingMismatch / Rejected) ve unit_price,
/// price_source_ref, dispute_reason domain metodları ile güncellenir.
/// </para>
/// </summary>
public interface ILinePricingResolver
{
    Task ResolveAsync(
        ReconciliationLine line,
        int customerId,
        ReconciliationFlow flow,
        string periodCode,
        decimal? expectedUnitPrice,
        CancellationToken cancellationToken = default);
}
