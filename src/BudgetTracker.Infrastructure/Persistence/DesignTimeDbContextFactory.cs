using BudgetTracker.Core.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BudgetTracker.Infrastructure.Persistence;

/// <summary>
/// Used by `dotnet ef` CLI for migration scaffolding. Connection string is intentionally
/// a placeholder — migrations are emitted as SQL, never executed against this context.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Port=5435;Database=budgettracker;Username=budgettracker;Password=budgettracker_dev_password",
                npgsql => npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention()
            .Options;

        return new ApplicationDbContext(options, new DesignTimeTenantContext());
    }

    private sealed class DesignTimeTenantContext : ITenantContext
    {
        public int? CurrentCompanyId => null;
        public bool BypassFilter => true;
    }
}
