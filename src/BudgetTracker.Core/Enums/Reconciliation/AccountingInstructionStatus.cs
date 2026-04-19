namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// AccountingInstruction yaşam döngüsü (Faz 1 spec §3.7). Sprint 1'de iskelet;
/// export Sprint 4'te aktive edilir.
/// </summary>
public enum AccountingInstructionStatus
{
    Ready = 0,
    Exported = 1,
    AckFromAccounting = 2,
    Rejected = 3,
}
