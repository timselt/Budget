using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class Segment : TenantEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    private Segment() { }

    public static Segment Create(int companyId, string code, string name, int displayOrder, DateTimeOffset createdAt, int? createdByUserId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        var segment = new Segment
        {
            Code = code,
            Name = name,
            DisplayOrder = displayOrder,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        segment.SetCompany(companyId);
        return segment;
    }

    private void SetCompany(int companyId)
    {
        if (companyId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(companyId));
        }
        CompanyId = companyId;
    }
}
