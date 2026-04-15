using Microsoft.AspNetCore.Identity;

namespace BudgetTracker.Infrastructure.Identity;

public sealed class Role : IdentityRole<int>
{
    public Role() { }

    public Role(string name) : base(name)
    {
        NormalizedName = name.ToUpperInvariant();
    }
}
