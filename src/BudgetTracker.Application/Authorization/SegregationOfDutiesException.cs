namespace BudgetTracker.Application.Authorization;

/// <summary>
/// Görev ayrılığı (segregation of duties) ihlal edildiğinde fırlatılır.
/// Örnek: aynı kullanıcı PriceBook'u hem oluşturup hem onaylamaya çalışırsa.
/// Spec: docs/Mutabakat_Modulu/docs/specs/00c_prereq_recon_agent_role.md §5.
/// </summary>
public sealed class SegregationOfDutiesException : Exception
{
    public SegregationOfDutiesException(string message)
        : base(message)
    {
    }
}
