namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Mutabakat iş akışı türü (Faz 1 spec §3.1). MVP kapsamında iki değer;
/// ileride Corporate / Dealer eklenebilir (genişletilebilir enum).
/// </summary>
public enum ReconciliationFlow
{
    Insurance = 0,
    Automotive = 1,
}
