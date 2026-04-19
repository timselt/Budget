namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Batch'in geldiği kaynak tipi (Faz 1 spec §3.2). InsurerList sigorta
/// akışı için, TarsPowerBi otomotiv için, ManualCsv operatörün serbest
/// yüklediği genel CSV için.
/// </summary>
public enum ReconciliationSourceType
{
    InsurerList = 0,
    TarsPowerBi = 1,
    ManualCsv = 2,
}
