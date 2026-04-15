using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BudgetTracker.IntegrationTests.Persistence;

[Collection(PostgresCollection.Name)]
public sealed class MigrationTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public MigrationTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Migration_CreatesAllExpectedTables()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """;

        var tables = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            tables.Add(reader.GetString(0));
        }

        tables.Should().Contain(new[]
        {
            "__EFMigrationsHistory",
            "audit_logs",
            "audit_logs_2026_04",
            "audit_logs_2026_05",
            "budget_versions",
            "budget_years",
            "companies",
            "currencies",
            "expense_categories",
            "fx_rates",
            "segments",
        });
    }

    [Fact]
    public async Task Migration_SeedsBaselineCurrenciesAndSegments()
    {
        await using var ctx = _fixture.CreateSuperuserContext();

        var currencies = await ctx.Currencies.AsNoTracking().Select(c => c.Code).ToListAsync();
        currencies.Should().BeEquivalentTo(new[] { "TRY", "USD", "EUR" });

        var segments = await ctx.Segments.AsNoTracking().Select(s => s.Code).ToListAsync();
        segments.Should().BeEquivalentTo(new[] { "SIGORTA", "OTOMOTIV", "FILO", "ALTERNATIF", "SGK_TESVIK" });

        var categoryCount = await ctx.ExpenseCategories.AsNoTracking().CountAsync();
        categoryCount.Should().Be(9);
    }

    [Fact]
    public async Task BudgetVersions_ExcludeConstraint_BlocksSecondActiveForSameYear()
    {
        // Arrange — create company, year, two versions both forced to Active.
        await using var ctx = _fixture.CreateSuperuserContext();

        var company = await EnsureCompanyAsync(ctx, "TAG-EXC", "Exclude Test Co");
        var year = BudgetYear.Create(company.Id, 2027, DateTimeOffset.UtcNow);
        ctx.BudgetYears.Add(year);
        await ctx.SaveChangesAsync();

        var v1 = BudgetVersion.CreateDraft(company.Id, year.Id, "v1", createdByUserId: 1);
        await ApproveAndActivateAsync(v1);
        ctx.BudgetVersions.Add(v1);
        await ctx.SaveChangesAsync();

        var v2 = BudgetVersion.CreateDraft(company.Id, year.Id, "v2", createdByUserId: 1);
        await ApproveAndActivateAsync(v2);
        ctx.BudgetVersions.Add(v2);

        // Act + Assert — second active version for the same (company_id, budget_year_id)
        // must be rejected by the EXCLUDE USING gist constraint.
        var act = async () => await ctx.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>()
            .Where(e => e.InnerException is PostgresException);
    }

    [Fact]
    public async Task RowLevelSecurity_BlocksCrossTenantReads_WhenUsingBudgetAppRole()
    {
        // Arrange — seed two companies + one budget_year each, as superuser.
        await using (var ctx = _fixture.CreateSuperuserContext())
        {
            var companyA = await EnsureCompanyAsync(ctx, "TAG-A", "Tenant A");
            var companyB = await EnsureCompanyAsync(ctx, "TAG-B", "Tenant B");

            ctx.BudgetYears.Add(BudgetYear.Create(companyA.Id, 2030, DateTimeOffset.UtcNow));
            ctx.BudgetYears.Add(BudgetYear.Create(companyB.Id, 2030, DateTimeOffset.UtcNow));
            await ctx.SaveChangesAsync();
        }

        int tenantAId, tenantBId;
        await using (var ctx = _fixture.CreateSuperuserContext())
        {
            tenantAId = (await ctx.Companies.AsNoTracking().FirstAsync(c => c.Code == "TAG-A")).Id;
            tenantBId = (await ctx.Companies.AsNoTracking().FirstAsync(c => c.Code == "TAG-B")).Id;
        }

        // Act — connect as budget_app with tenant A scope.
        await using var tenantAContext = _fixture.CreateBudgetAppContext(new TestTenantContext(tenantAId));

        var visibleYears = await tenantAContext.BudgetYears
            .AsNoTracking()
            .IgnoreQueryFilters() // bypass EF filter to prove RLS is the actual gate
            .Select(y => new { y.CompanyId, y.Year })
            .ToListAsync();

        // Assert — RLS must hide tenant B rows even when EF filter is bypassed.
        visibleYears.Should().OnlyContain(y => y.CompanyId == tenantAId);
        visibleYears.Should().NotContain(y => y.CompanyId == tenantBId);
    }

    [Fact]
    public async Task RowLevelSecurity_DefaultDeny_WhenGucIsUnset()
    {
        // Arrange — seed one row as superuser.
        await using (var ctx = _fixture.CreateSuperuserContext())
        {
            var company = await EnsureCompanyAsync(ctx, "TAG-DENY", "Deny Test Co");
            ctx.BudgetYears.Add(BudgetYear.Create(company.Id, 2031, DateTimeOffset.UtcNow));
            await ctx.SaveChangesAsync();
        }

        // Act — bypass tenant means GUC is reset to empty string.
        await using var bypassContext = _fixture.CreateBudgetAppContext(new TestTenantContext(null, bypass: true));

        var visible = await bypassContext.BudgetYears
            .AsNoTracking()
            .IgnoreQueryFilters()
            .CountAsync();

        // Assert — default-deny: empty GUC must yield zero rows for budget_app.
        visible.Should().Be(0);
    }

    [Fact]
    public async Task AuditLogs_PartitionRouting_PlacesRowInCorrectMonthlyChild()
    {
        await using var ctx = _fixture.CreateSuperuserContext();

        var entry = AuditLogEntry.Create(
            companyId: null,
            userId: null,
            entityName: "test",
            entityKey: "1",
            action: "INSERT",
            oldValuesJson: null,
            newValuesJson: "{}",
            correlationId: null,
            ipAddress: null,
            createdAt: new DateTimeOffset(2026, 4, 15, 10, 0, 0, TimeSpan.Zero));

        ctx.AuditLogs.Add(entry);
        await ctx.SaveChangesAsync();

        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT count(*) FROM audit_logs_2026_04 WHERE entity_name = 'test'";
        var count = (long)(await cmd.ExecuteScalarAsync())!;

        count.Should().Be(1);
    }

    private static async Task<Company> EnsureCompanyAsync(BudgetTracker.Infrastructure.Persistence.ApplicationDbContext ctx, string code, string name)
    {
        var existing = await ctx.Companies.FirstOrDefaultAsync(c => c.Code == code);
        if (existing is not null) return existing;

        var company = Company.Create(code, name, "TRY", DateTimeOffset.UtcNow);
        ctx.Companies.Add(company);
        await ctx.SaveChangesAsync();
        return company;
    }

    private static Task ApproveAndActivateAsync(BudgetVersion version)
    {
        version.Submit(actorUserId: 1);
        version.ApproveByDepartment(actorUserId: 1);
        version.ApproveByFinance(actorUserId: 1);
        version.ApproveByCfo(actorUserId: 1);
        version.Activate(actorUserId: 1);
        return Task.CompletedTask;
    }
}
