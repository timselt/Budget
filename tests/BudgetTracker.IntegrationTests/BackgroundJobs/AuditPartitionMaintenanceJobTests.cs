using BudgetTracker.Infrastructure.BackgroundJobs;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace BudgetTracker.IntegrationTests.BackgroundJobs;

[Collection(PostgresCollection.Name)]
public sealed class AuditPartitionMaintenanceJobTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public AuditPartitionMaintenanceJobTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Execute_CreatesCurrentMonthAndNextThreeMonths_Idempotently()
    {
        // Arrange — fixed clock: 2026-06-15. Baseline migration ships 2026_04 and 2026_05.
        var clock = new FixedClock(new DateTimeOffset(2026, 6, 15, 0, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditPartitionMaintenanceJob(ctx, clock, NullLogger<AuditPartitionMaintenanceJob>.Instance);

        // Act — run twice to prove idempotency.
        await sut.ExecuteAsync(CancellationToken.None);
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert — partitions 2026_06..2026_09 exist.
        var partitions = await ListAuditPartitionsAsync();
        partitions.Should().Contain(new[]
        {
            "audit_logs_2026_06",
            "audit_logs_2026_07",
            "audit_logs_2026_08",
            "audit_logs_2026_09",
        });
    }

    [Fact]
    public async Task Execute_DropsPartitionsOlderThanRetentionWindow()
    {
        // Arrange — create a fake-old partition (2018_12) that is beyond the 84-month retention.
        await CreatePartitionAsync(new DateOnly(2018, 12, 1));

        // Clock at 2026-06-15 → retention cutoff = 2026-06 minus 84 months = 2019-06.
        // So 2018-12 < 2019-06 → must be dropped.
        var clock = new FixedClock(new DateTimeOffset(2026, 6, 15, 0, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditPartitionMaintenanceJob(ctx, clock, NullLogger<AuditPartitionMaintenanceJob>.Instance);

        // Sanity: partition exists before run.
        (await ListAuditPartitionsAsync()).Should().Contain("audit_logs_2018_12");

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert — old partition is gone, fresh partitions still created.
        var after = await ListAuditPartitionsAsync();
        after.Should().NotContain("audit_logs_2018_12");
        after.Should().Contain("audit_logs_2026_06");
    }

    [Fact]
    public async Task Execute_DoesNotDropPartitionsInsideRetentionWindow()
    {
        // Arrange — partition just inside window: 2019-07 (cutoff is 2019-06, so 2019-07 stays).
        await CreatePartitionAsync(new DateOnly(2019, 7, 1));

        var clock = new FixedClock(new DateTimeOffset(2026, 6, 15, 0, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditPartitionMaintenanceJob(ctx, clock, NullLogger<AuditPartitionMaintenanceJob>.Instance);

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert
        var after = await ListAuditPartitionsAsync();
        after.Should().Contain("audit_logs_2019_07");
    }

    [Fact]
    public async Task Execute_GrantsBudgetAppInsertSelect_OnNewlyCreatedPartition()
    {
        // Arrange — run for a fresh month so a brand-new partition is created.
        var clock = new FixedClock(new DateTimeOffset(2026, 7, 10, 0, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditPartitionMaintenanceJob(ctx, clock, NullLogger<AuditPartitionMaintenanceJob>.Instance);

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert — budget_app must hold INSERT and SELECT on the new partition,
        // otherwise the application role cannot write audit rows to it.
        var grants = await ListGrantsForRoleAsync("audit_logs_2026_07", "budget_app");
        grants.Should().Contain(new[] { "INSERT", "SELECT" });
    }

    [Fact]
    public async Task Execute_NewPartitionInheritsParentIndexes()
    {
        // Postgres 16 automatically propagates parent indexes (ix_audit_logs_company_created,
        // ix_audit_logs_entity) to child partitions. This test locks that behaviour in so a
        // future migration removing them from the parent is caught by CI.
        var clock = new FixedClock(new DateTimeOffset(2026, 8, 5, 0, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditPartitionMaintenanceJob(ctx, clock, NullLogger<AuditPartitionMaintenanceJob>.Instance);

        await sut.ExecuteAsync(CancellationToken.None);

        // Postgres names child indexes after the partition + indexed columns,
        // so we match on column fragments rather than the parent's custom index names.
        var indexes = await ListIndexesAsync("audit_logs_2026_08");
        indexes.Should().Contain(n => n.Contains("company_id_created_at"));
        indexes.Should().Contain(n => n.Contains("entity_name_entity_key"));
    }

    private async Task<List<string>> ListAuditPartitionsAsync()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT c.relname
            FROM pg_inherits i
            JOIN pg_class c ON c.oid = i.inhrelid
            JOIN pg_class p ON p.oid = i.inhparent
            WHERE p.relname = 'audit_logs'
            ORDER BY c.relname
            """;
        var names = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) names.Add(reader.GetString(0));
        return names;
    }

    private async Task<List<string>> ListGrantsForRoleAsync(string tableName, string role)
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT privilege_type
            FROM information_schema.role_table_grants
            WHERE table_name = @t AND grantee = @r
            """;
        cmd.Parameters.Add(new NpgsqlParameter("t", tableName));
        cmd.Parameters.Add(new NpgsqlParameter("r", role));
        var grants = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) grants.Add(reader.GetString(0));
        return grants;
    }

    private async Task<List<string>> ListIndexesAsync(string tableName)
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = @t
            """;
        cmd.Parameters.Add(new NpgsqlParameter("t", tableName));
        var names = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) names.Add(reader.GetString(0));
        return names;
    }

    private async Task CreatePartitionAsync(DateOnly monthStart)
    {
        var monthEnd = monthStart.AddMonths(1);
        var name = $"audit_logs_{monthStart.Year:D4}_{monthStart.Month:D2}";
        var sql =
            $"CREATE TABLE IF NOT EXISTS {name} PARTITION OF audit_logs " +
            $"FOR VALUES FROM ('{monthStart:yyyy-MM-dd} 00:00:00+00') TO ('{monthEnd:yyyy-MM-dd} 00:00:00+00');";
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }
}
