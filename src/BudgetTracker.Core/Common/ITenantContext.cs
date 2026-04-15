namespace BudgetTracker.Core.Common;

public interface ITenantContext
{
    int? CurrentCompanyId { get; }
    bool BypassFilter { get; }
}
