using BudgetTracker.Core.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BudgetTracker.Infrastructure.Persistence;

/// <summary>
/// Used by <c>dotnet ef</c> CLI for migration scaffolding and <c>database update</c>.
/// Reads <c>ConnectionStrings__Default</c> env var so CI/CD and prod migrations target
/// the correct DB (Supabase, Railway Postgres, etc.). Falls back to local docker-compose
/// Postgres so local <c>dotnet ef migrations add</c> keeps working without env setup.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    private const string LocalDevFallback =
        "Host=localhost;Port=5435;Database=budgettracker;Username=budgettracker;Password=budgettracker_dev_password";

    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? Environment.GetEnvironmentVariable("CONNECTIONSTRINGS__DEFAULT")
            ?? LocalDevFallback;

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString,
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
