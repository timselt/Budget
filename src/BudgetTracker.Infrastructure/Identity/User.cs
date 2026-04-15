using Microsoft.AspNetCore.Identity;

namespace BudgetTracker.Infrastructure.Identity;

public sealed class User : IdentityUser<int>
{
    public string DisplayName { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<UserCompany> Companies { get; set; } = new List<UserCompany>();
}
