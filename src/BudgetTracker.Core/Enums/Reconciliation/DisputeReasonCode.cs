namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Müşteri itirazı veya line reddi için sonlu liste (Faz 1 spec §7).
/// UI sadece bu listeden seçtirir; OTHER seçildiğinde dispute_note zorunlu.
/// Sprint 1'de iskelet; agent UI'ı Sprint 2'de bu kodları seçtirir.
/// </summary>
public enum DisputeReasonCode
{
    PriceMismatch = 0,
    QtyMismatch = 1,

    /// <summary>Sadece sigorta akışı.</summary>
    PkgNotInContract = 2,

    /// <summary>Sadece otomotiv akışı.</summary>
    ServiceNotRendered = 3,

    Duplicate = 4,

    /// <summary>Sadece sigorta akışı.</summary>
    PolicyCancelled = 5,

    PeriodMismatch = 6,
    Other = 7,
}
