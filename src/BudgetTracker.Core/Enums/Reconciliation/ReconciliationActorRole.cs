namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Decision aktör rolü (Faz 1 spec §3.6). Customer rolü dışarıdan onay
/// linki ile aksiyon alır; System otomatik geçişler için (örn. timeout).
/// </summary>
public enum ReconciliationActorRole
{
    ReconAgent = 0,
    Customer = 1,
    System = 2,
}
