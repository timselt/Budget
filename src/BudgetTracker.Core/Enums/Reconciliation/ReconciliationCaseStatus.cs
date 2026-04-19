namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Case yaşam döngüsü (Faz 1 spec §4.1). Sprint 1'de iskelet olarak kalır;
/// state machine enforcement Sprint 2'de devreye girer (Case auto-create).
/// </summary>
public enum ReconciliationCaseStatus
{
    Draft = 0,
    UnderControl = 1,
    PricingMatched = 2,
    SentToCustomer = 3,
    CustomerApproved = 4,
    CustomerDisputed = 5,
    ReadyForAccounting = 6,

    /// <summary>Terminal — Faz 2 fatura akışına devredilir.</summary>
    SentToAccounting = 7,
}
