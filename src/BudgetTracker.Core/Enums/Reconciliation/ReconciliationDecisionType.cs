namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Decision append-only (Faz 1 spec §3.6). Line üzerinde alınan her aksiyonun
/// türü. Sprint 1'de tablo iskelet olarak oluşur; aksiyonlar Sprint 2-3'te aktif.
/// </summary>
public enum ReconciliationDecisionType
{
    Reviewed = 0,
    SentToCustomer = 1,
    CustomerApproved = 2,
    CustomerDisputed = 3,
    ReturnedForCorrection = 4,
    ReadyForAccounting = 5,
}
