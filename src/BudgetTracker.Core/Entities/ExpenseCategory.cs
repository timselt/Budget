using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class ExpenseCategory : TenantEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public ExpenseClassification Classification { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    private ExpenseCategory() { }

    public static ExpenseCategory Create(
        int companyId,
        string code,
        string name,
        ExpenseClassification classification,
        int displayOrder,
        DateTimeOffset createdAt,
        int? createdByUserId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (companyId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(companyId));
        }

        var entity = new ExpenseCategory
        {
            Code = code,
            Name = name,
            Classification = classification,
            DisplayOrder = displayOrder,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }
}
