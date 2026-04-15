using BudgetTracker.Core.Entities;

namespace BudgetTracker.Infrastructure.Identity;

public sealed class UserCompany
{
    public int UserId { get; set; }
    public int CompanyId { get; set; }
    public bool IsDefault { get; set; }
    public DateTimeOffset AssignedAt { get; set; }
    public int? AssignedByUserId { get; set; }

    public User User { get; set; } = default!;
    public Company Company { get; set; } = default!;
}
