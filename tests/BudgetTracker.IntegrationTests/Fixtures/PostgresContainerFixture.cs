using BudgetTracker.Core.Common;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

namespace BudgetTracker.IntegrationTests.Fixtures;

/// <summary>
/// Single Postgres 16 container shared across the test collection.
/// Migration runs once at startup; each test resets data via Respawn.
///
/// Two connection strings are exposed:
///  - <see cref="SuperuserConnectionString"/> — default postgres user, bypasses RLS.
///    Used for arrangement (seeding tenant data) and Respawn checkpoints.
///  - <see cref="BudgetAppConnectionString"/> — non-superuser application role
///    created by the migration. RLS is enforced for this role.
/// </summary>
public sealed class PostgresContainerFixture : IAsyncLifetime
{
    private const string BudgetAppPassword = "budget_app_dev_password";

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("budgettracker_test")
        .WithUsername("postgres")
        .WithPassword("postgres_test_password")
        .Build();

    private Respawner? _respawner;

    public string SuperuserConnectionString => _container.GetConnectionString();

    public string BudgetAppConnectionString
    {
        get
        {
            var builder = new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
            {
                Username = "budget_app",
                Password = BudgetAppPassword,
            };
            return builder.ConnectionString;
        }
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Apply the EF migration as superuser. The migration itself creates the
        // budget_app role, RLS policies, partitioned audit_logs, and seeds.
        await using (var ctx = CreateSuperuserContext())
        {
            await ctx.Database.MigrateAsync();
        }

        await using var conn = new NpgsqlConnection(SuperuserConnectionString);
        await conn.OpenAsync();

        _respawner = await Respawner.CreateAsync(conn, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = new[] { "public" },
            TablesToIgnore = new Respawn.Graph.Table[]
            {
                new("public", "__EFMigrationsHistory"),
                new("public", "currencies"),
                new("public", "companies"),
                new("public", "segments"),
                new("public", "expense_categories"),
            },
        });
    }

    public async Task ResetAsync()
    {
        if (_respawner is null) return;

        await using var conn = new NpgsqlConnection(SuperuserConnectionString);
        await conn.OpenAsync();
        await _respawner.ResetAsync(conn);
    }

    public ApplicationDbContext CreateSuperuserContext(ITenantContext? tenantContext = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(SuperuserConnectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention()
            .Options;

        return new ApplicationDbContext(options, tenantContext ?? new BypassTenantContext());
    }

    public ApplicationDbContext CreateBudgetAppContext(ITenantContext tenantContext)
    {
        var interceptor = new BudgetTracker.Infrastructure.Persistence.Interceptors.TenantConnectionInterceptor(tenantContext);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(BudgetAppConnectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(interceptor)
            .Options;

        return new ApplicationDbContext(options, tenantContext);
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    private sealed class BypassTenantContext : ITenantContext
    {
        public int? CurrentCompanyId => null;
        public bool BypassFilter => true;
    }
}

[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresContainerFixture>
{
    public const string Name = "Postgres";
}
