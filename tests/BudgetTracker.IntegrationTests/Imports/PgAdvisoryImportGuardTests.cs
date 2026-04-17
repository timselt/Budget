using BudgetTracker.Application.Imports;
using BudgetTracker.Infrastructure.Imports;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;

namespace BudgetTracker.IntegrationTests.Imports;

/// <summary>
/// Proves the ADR-0008 §2.3 concurrency guarantee: one tenant can only hold a
/// single in-flight import lock on a given resource at a time, and the lock
/// releases automatically when the owning transaction ends.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class PgAdvisoryImportGuardTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public PgAdvisoryImportGuardTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task TryAcquire_WhenNoOtherHolder_ReturnsTrue()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        await using var tx = await ctx.Database.BeginTransactionAsync();

        var guard = new PgAdvisoryImportGuard(ctx);
        var acquired = await guard.TryAcquireAsync(1, "budget_entries", CancellationToken.None);

        acquired.Should().BeTrue();
    }

    [Fact]
    public async Task TryAcquire_SecondCallerOnSameTenantResource_ReturnsFalse()
    {
        // Two distinct DbContexts → two distinct DB connections → two distinct
        // Postgres backend processes. pg_try_advisory_xact_lock is non-blocking,
        // so the contender sees `false` rather than hanging.
        await using var ctxA = _fixture.CreateSuperuserContext();
        await using var ctxB = _fixture.CreateSuperuserContext();

        await using var txA = await ctxA.Database.BeginTransactionAsync();
        await using var txB = await ctxB.Database.BeginTransactionAsync();

        var guardA = new PgAdvisoryImportGuard(ctxA);
        var guardB = new PgAdvisoryImportGuard(ctxB);

        (await guardA.TryAcquireAsync(42, "budget_entries", CancellationToken.None)).Should().BeTrue();
        (await guardB.TryAcquireAsync(42, "budget_entries", CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task TryAcquire_DifferentTenants_BothSucceed()
    {
        await using var ctxA = _fixture.CreateSuperuserContext();
        await using var ctxB = _fixture.CreateSuperuserContext();

        await using var txA = await ctxA.Database.BeginTransactionAsync();
        await using var txB = await ctxB.Database.BeginTransactionAsync();

        var guardA = new PgAdvisoryImportGuard(ctxA);
        var guardB = new PgAdvisoryImportGuard(ctxB);

        (await guardA.TryAcquireAsync(1, "budget_entries", CancellationToken.None)).Should().BeTrue();
        (await guardB.TryAcquireAsync(2, "budget_entries", CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task TryAcquire_DifferentResourcesSameTenant_BothSucceed()
    {
        await using var ctxA = _fixture.CreateSuperuserContext();
        await using var ctxB = _fixture.CreateSuperuserContext();

        await using var txA = await ctxA.Database.BeginTransactionAsync();
        await using var txB = await ctxB.Database.BeginTransactionAsync();

        var guardA = new PgAdvisoryImportGuard(ctxA);
        var guardB = new PgAdvisoryImportGuard(ctxB);

        (await guardA.TryAcquireAsync(42, "budget_entries", CancellationToken.None)).Should().BeTrue();
        (await guardB.TryAcquireAsync(42, "expenses", CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task TryAcquire_AfterFirstHolderCommits_SecondCallerCanAcquire()
    {
        // Lock auto-releases on tx end — a subsequent attempt outside the first
        // transaction must succeed.
        await using (var ctxA = _fixture.CreateSuperuserContext())
        await using (var txA = await ctxA.Database.BeginTransactionAsync())
        {
            var guardA = new PgAdvisoryImportGuard(ctxA);
            (await guardA.TryAcquireAsync(7, "budget_entries", CancellationToken.None)).Should().BeTrue();
            await txA.CommitAsync();
        }

        await using var ctxB = _fixture.CreateSuperuserContext();
        await using var txB = await ctxB.Database.BeginTransactionAsync();
        var guardB = new PgAdvisoryImportGuard(ctxB);
        (await guardB.TryAcquireAsync(7, "budget_entries", CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task TryAcquire_WithoutActiveTransaction_Throws()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var guard = new PgAdvisoryImportGuard(ctx);

        var act = async () =>
            await guard.TryAcquireAsync(1, "budget_entries", CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*active database transaction*");
    }
}
