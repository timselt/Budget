using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Npgsql;

namespace BudgetTracker.IntegrationTests.Reconciliation;

/// <summary>
/// Sprint 1 migration integration test'leri: 7 yeni Mutabakat tablosu +
/// RLS policy 3 tenant-aware tabloda + duplicate hash unique constraint.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ReconciliationModuleMigrationTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public ReconciliationModuleMigrationTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Migration_CreatesAllSevenReconciliationTables()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename IN (
                'reconciliation_batches',
                'reconciliation_source_rows',
                'reconciliation_cases',
                'reconciliation_lines',
                'reconciliation_decisions',
                'accounting_instructions',
                'risk_rule_sets')
            ORDER BY tablename;";
        var tables = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) tables.Add(reader.GetString(0));

        tables.Should().BeEquivalentTo(new[]
        {
            "accounting_instructions",
            "reconciliation_batches",
            "reconciliation_cases",
            "reconciliation_decisions",
            "reconciliation_lines",
            "reconciliation_source_rows",
            "risk_rule_sets",
        });
    }

    [Fact]
    public async Task Migration_EnablesRowLevelSecurityOnTenantTables()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname IN (
                'reconciliation_batches',
                'reconciliation_cases',
                'accounting_instructions',
                'reconciliation_source_rows',
                'reconciliation_lines',
                'risk_rule_sets')
            ORDER BY relname;";

        var rows = new Dictionary<string, (bool rls, bool force)>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows[reader.GetString(0)] = (reader.GetBoolean(1), reader.GetBoolean(2));
        }

        // Tenant-aware tablolarda RLS aktif + force.
        rows["reconciliation_batches"].Should().Be((true, true));
        rows["reconciliation_cases"].Should().Be((true, true));
        rows["accounting_instructions"].Should().Be((true, true));

        // Child tablolar (parent FK cascade ile korunur) — RLS yok.
        rows["reconciliation_source_rows"].Should().Be((false, false));
        rows["reconciliation_lines"].Should().Be((false, false));
        // risk_rule_sets — global config, RLS yok.
        rows["risk_rule_sets"].Should().Be((false, false));
    }

    [Fact]
    public async Task Migration_AppliesTenantIsolationPolicy()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT tablename FROM pg_policies
            WHERE schemaname = 'public'
              AND policyname = 'tenant_isolation'
              AND tablename IN (
                'reconciliation_batches',
                'reconciliation_cases',
                'accounting_instructions')
            ORDER BY tablename;";

        var policies = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) policies.Add(reader.GetString(0));

        policies.Should().BeEquivalentTo(new[]
        {
            "accounting_instructions",
            "reconciliation_batches",
            "reconciliation_cases",
        });
    }

    [Fact]
    public async Task Migration_HasUniqueIndexOnCompanyAndSourceFileHash()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT indexname FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'reconciliation_batches'
              AND indexname LIKE '%source_file_hash%';";
        var name = await cmd.ExecuteScalarAsync() as string;
        name.Should().NotBeNullOrEmpty(
            "duplicate import koruması için (company_id, source_file_hash) unique index olmalı");
    }
}
