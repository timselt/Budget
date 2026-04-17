using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.IntegrationTests.Fixtures;

/// <summary>
/// Thin <see cref="IDbContextFactory{ApplicationDbContext}"/> adapter so tests can
/// hand <c>AuditLogger</c> the same fixture-backed context factory the runtime
/// uses (ADR-0007 §2.6), without wiring a full DI container.
/// </summary>
internal sealed class TestDbContextFactory : IDbContextFactory<ApplicationDbContext>
{
    private readonly Func<ApplicationDbContext> _create;

    public TestDbContextFactory(Func<ApplicationDbContext> create) => _create = create;

    public ApplicationDbContext CreateDbContext() => _create();

    public Task<ApplicationDbContext> CreateDbContextAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_create());
}
