using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.IntegrationTests.Persistence;

/// <summary>
/// Locks in the ADR-0007 §2.7 contract for <c>TenantConnectionInterceptor</c>: both the
/// async and the sync connection-open paths set (or reset) the
/// <c>app.current_company_id</c> GUC directly, without bridging across the sync ⇄ async
/// boundary. A regression on the sync path would reintroduce the deadlock hazard that
/// csharp-reviewer flagged on feat/f1-operational-closure.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class TenantConnectionInterceptorTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public TenantConnectionInterceptorTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task AsyncPath_TenantScope_SetsGuc()
    {
        await using var ctx = _fixture.CreateBudgetAppContext(new TestTenantContext(42));

        // Forces an async connection open through EF.
        var guc = await ctx.Database
            .SqlQuery<string?>($"SELECT current_setting('app.current_company_id', true) AS \"Value\"")
            .FirstAsync();

        guc.Should().Be("42");
    }

    [Fact]
    public async Task AsyncPath_BypassScope_ResetsGucToEmpty()
    {
        await using var ctx = _fixture.CreateBudgetAppContext(new TestTenantContext(null, bypass: true));

        var guc = await ctx.Database
            .SqlQuery<string?>($"SELECT current_setting('app.current_company_id', true) AS \"Value\"")
            .FirstAsync();

        guc.Should().BeEmpty();
    }

    [Fact]
    public async Task SyncPath_TenantScope_SetsGucWithoutDeadlock()
    {
        // Explicitly open the connection via the sync API so the interceptor's
        // sync override (ConnectionOpened) is exercised instead of the async one.
        await using var ctx = _fixture.CreateBudgetAppContext(new TestTenantContext(7));

        ctx.Database.OpenConnection();
        try
        {
            var conn = ctx.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT current_setting('app.current_company_id', true)";
            var guc = (string?)await cmd.ExecuteScalarAsync();
            guc.Should().Be("7");
        }
        finally
        {
            ctx.Database.CloseConnection();
        }
    }

    [Fact]
    public async Task SyncPath_BypassScope_ResetsGucToEmpty()
    {
        await using var ctx = _fixture.CreateBudgetAppContext(new TestTenantContext(null, bypass: true));

        ctx.Database.OpenConnection();
        try
        {
            var conn = ctx.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT current_setting('app.current_company_id', true)";
            var guc = (string?)await cmd.ExecuteScalarAsync();
            guc.Should().BeEmpty();
        }
        finally
        {
            ctx.Database.CloseConnection();
        }
    }
}
