using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class Scenario : TenantEntity
{
    public string Name { get; private set; } = default!;
    public int BudgetVersionId { get; private set; }
    public string ParametersJson { get; private set; } = default!;

    public BudgetVersion? BudgetVersion { get; private set; }

    private Scenario() { }

    public static Scenario Create(
        int companyId,
        string name,
        int budgetVersionId,
        string parametersJson,
        int createdByUserId)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (budgetVersionId <= 0) throw new ArgumentOutOfRangeException(nameof(budgetVersionId));
        ArgumentException.ThrowIfNullOrWhiteSpace(parametersJson);

        var scenario = new Scenario
        {
            Name = name,
            BudgetVersionId = budgetVersionId,
            ParametersJson = parametersJson,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = createdByUserId
        };
        scenario.CompanyId = companyId;
        return scenario;
    }
}
