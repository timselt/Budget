using BudgetTracker.Application.Audit;
using BudgetTracker.Infrastructure.Audit;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace BudgetTracker.IntegrationTests.Audit;

[Collection(PostgresCollection.Name)]
public sealed class AuditLoggerIntegrationTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public AuditLoggerIntegrationTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task LogAsync_WritesEntry_RoutesToApril2026Partition()
    {
        // Arrange
        var clock = new FixedClock(new DateTimeOffset(2026, 4, 15, 12, 30, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditLogger(ctx, clock, NullLogger<AuditLogger>.Instance);

        var evt = new AuditEvent(
            EntityName: AuditEntityNames.UserAccount,
            EntityKey: "99",
            Action: AuditActions.AuthSignIn,
            UserId: 99,
            IpAddress: "127.0.0.1");

        // Act
        await sut.LogAsync(evt, CancellationToken.None);

        // Assert
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT count(*) FROM audit_logs_2026_04
            WHERE action = 'AUTH_SIGN_IN' AND user_id = 99
            """;
        var count = (long)(await cmd.ExecuteScalarAsync())!;
        count.Should().Be(1);
    }

    [Fact]
    public async Task LogAsync_ThreeAuthEventsForSameUser_AllPersisted()
    {
        // Arrange
        var clock = new FixedClock(new DateTimeOffset(2026, 4, 17, 8, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditLogger(ctx, clock, NullLogger<AuditLogger>.Instance);

        // Act
        await sut.LogAsync(new AuditEvent(AuditEntityNames.UserAccount, "42", AuditActions.AuthRegister, UserId: 42), CancellationToken.None);
        await sut.LogAsync(new AuditEvent(AuditEntityNames.UserAccount, "42", AuditActions.AuthSignIn, UserId: 42), CancellationToken.None);
        await sut.LogAsync(new AuditEvent(AuditEntityNames.UserAccount, "42", AuditActions.AuthSignOut, UserId: 42), CancellationToken.None);

        // Assert — order by id preserves insertion order within same timestamp.
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT action FROM audit_logs_2026_04
            WHERE user_id = 42
            ORDER BY id
            """;
        var actions = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) actions.Add(reader.GetString(0));
        actions.Should().Equal(AuditActions.AuthRegister, AuditActions.AuthSignIn, AuditActions.AuthSignOut);
    }

    [Fact]
    public async Task LogAsync_WithNullableFields_PersistsNullColumns()
    {
        // Arrange
        var clock = new FixedClock(new DateTimeOffset(2026, 4, 17, 8, 0, 0, TimeSpan.Zero));
        await using var ctx = _fixture.CreateSuperuserContext();
        var sut = new AuditLogger(ctx, clock, NullLogger<AuditLogger>.Instance);

        // Act — minimal required fields only.
        await sut.LogAsync(
            new AuditEvent(AuditEntityNames.UserAccount, "77", AuditActions.AuthSignInFailed),
            CancellationToken.None);

        // Assert
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT company_id, user_id, ip_address
            FROM audit_logs_2026_04
            WHERE entity_key = '77' AND action = 'AUTH_SIGN_IN_FAILED'
            """;
        await using var reader = await cmd.ExecuteReaderAsync();
        (await reader.ReadAsync()).Should().BeTrue();
        reader.IsDBNull(0).Should().BeTrue("company_id should be null when not provided");
        reader.IsDBNull(1).Should().BeTrue("user_id should be null when not provided");
        reader.IsDBNull(2).Should().BeTrue("ip_address should be null when not provided");
    }
}
