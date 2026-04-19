namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Line yaşam döngüsü (Faz 1 spec §4.2). Sprint 1'de iskelet; PricingMismatch
/// ve Ready otomatik atama Sprint 2'de PriceBook lookup ile yapılır.
/// </summary>
public enum ReconciliationLineStatus
{
    PendingReview = 0,
    PricingMismatch = 1,
    Ready = 2,
    Disputed = 3,

    /// <summary>Terminal — kapanır, faturalanmaz.</summary>
    Rejected = 4,
}
