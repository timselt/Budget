namespace BudgetTracker.Core.Common;

public abstract class TenantEntity : BaseEntity
{
    public int CompanyId { get; protected set; }
}
