namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Mutabakat modülü akış ayrımı (00b §2.1). <see cref="SalesType"/>'tan türetilir,
/// DB'de kolon olarak tutulmaz:
/// <list type="bullet">
///   <item><description><see cref="Insurance"/> ← Insurance / DirectChannel / Medical</description></item>
///   <item><description><see cref="Automotive"/> ← Automotive / Fleet</description></item>
/// </list>
/// Risk kuralları ve eşleme algoritmaları bu ayrıma göre parametrelendirilir
/// (EXCEL_ANALYSIS.md §4: otomotivde ORTA eşiği 10 gün, sigortada 30 gün).
/// </summary>
public enum ContractFlow
{
    Insurance = 0,
    Automotive = 1
}

/// <summary><see cref="SalesType"/> → <see cref="ContractFlow"/> tekil eşleme.</summary>
public static class ContractFlowMapper
{
    public static ContractFlow FromSalesType(SalesType salesType) => salesType switch
    {
        SalesType.Insurance or SalesType.DirectChannel or SalesType.Medical => ContractFlow.Insurance,
        SalesType.Automotive or SalesType.Fleet => ContractFlow.Automotive,
        _ => throw new ArgumentOutOfRangeException(nameof(salesType), salesType, "unmapped sales type")
    };
}
