namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Mutabakat iş akışı türü. ButceMusteriler.xlsx (2026-04-21) müşteri kategorilerine
/// göre 4 akış — spec §3.1 genişletilebilir tanımına göre Filo + Alternatif eklendi.
/// ADR-0017 bkz.
/// </summary>
public enum ReconciliationFlow
{
    Insurance = 0,
    Automotive = 1,
    Filo = 2,
    Alternatif = 3,
}
