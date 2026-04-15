using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class BudgetYear : TenantEntity
{
    public int Year { get; private set; }
    public bool IsLocked { get; private set; }

    private BudgetYear() { }

    public static BudgetYear Create(int companyId, int year, DateTimeOffset createdAt, int? createdByUserId = null)
    {
        if (companyId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(companyId));
        }
        if (year is < 2000 or > 2100)
        {
            throw new ArgumentOutOfRangeException(nameof(year));
        }

        var entity = new BudgetYear
        {
            Year = year,
            IsLocked = false,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }

    public void Lock(int actorUserId, DateTimeOffset lockedAt)
    {
        IsLocked = true;
        UpdatedAt = lockedAt;
        UpdatedByUserId = actorUserId;
    }
}
