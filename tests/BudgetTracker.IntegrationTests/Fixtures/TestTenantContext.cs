using BudgetTracker.Core.Common;

namespace BudgetTracker.IntegrationTests.Fixtures;

public sealed class TestTenantContext : ITenantContext
{
    public TestTenantContext(int? companyId, bool bypass = false)
    {
        CurrentCompanyId = companyId;
        BypassFilter = bypass;
    }

    public int? CurrentCompanyId { get; }
    public bool BypassFilter { get; }
}
