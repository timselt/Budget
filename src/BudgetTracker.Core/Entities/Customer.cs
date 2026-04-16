using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class Customer : TenantEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public int SegmentId { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public string? SourceSheet { get; private set; }
    public string? Notes { get; private set; }
    public string? AccountNo { get; private set; }
    public string? FullTitle { get; private set; }
    public bool IsActive { get; private set; }

    private Customer() { }

    public static Customer Create(
        int companyId,
        string code,
        string name,
        int segmentId,
        int createdByUserId,
        DateTimeOffset createdAt,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? sourceSheet = null,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (code.Length > 30) throw new ArgumentException("code max 30 characters", nameof(code));
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));

        return new Customer
        {
            CompanyId = companyId,
            Code = code,
            Name = name,
            SegmentId = segmentId,
            StartDate = startDate,
            EndDate = endDate,
            SourceSheet = sourceSheet,
            Notes = notes,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void Update(
        string name,
        int segmentId,
        DateOnly? startDate,
        DateOnly? endDate,
        string? notes,
        bool isActive,
        int actorUserId,
        DateTimeOffset updatedAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));

        Name = name;
        SegmentId = segmentId;
        StartDate = startDate;
        EndDate = endDate;
        Notes = notes;
        IsActive = isActive;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
