namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Muhasebeye export formatı (Faz 1 spec §3.7). Sprint 4'te ExcelPackage
/// (ClosedXML) ve Csv aktive edilir; ErpApiV1 ileride entegrasyonla gelir.
/// </summary>
public enum AccountingInstructionExportFormat
{
    ExcelPackage = 0,
    Csv = 1,
    ErpApiV1 = 2,
}
