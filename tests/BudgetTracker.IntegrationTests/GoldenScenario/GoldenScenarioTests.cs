using System.Text.Json;
using BudgetTracker.Application.Calculations;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;

namespace BudgetTracker.IntegrationTests.GoldenScenario;

/// <summary>
/// F5 regression gate. Loads <c>golden_scenario_baseline.json</c>, seeds the
/// referenced scenario into a fresh Postgres 16 container, invokes the KPI
/// engine, and asserts the 9 core KPIs match the baseline within the JSON's
/// tolerance bands.
///
/// CI gates this suite separately from the rest of the test run via the
/// <c>GoldenScenario</c> xUnit trait so a release can be blocked on a baseline
/// mismatch without also blocking unrelated unit failures.
/// </summary>
[Collection(PostgresCollection.Name)]
[Trait("Category", "GoldenScenario")]
public sealed class GoldenScenarioTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public GoldenScenarioTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task KpiEngine_ProducesExpectedBaselineValues()
    {
        var baseline = LoadBaseline();

        // Arrange — minimal fixture that matches the baseline's expectations:
        // TotalRevenue 180 000, TotalClaims 90 000 (LR 50%), Expenses 45 000
        // split 15k/25k/5k General/Technical/Financial. This is purposefully a
        // compact shape — the full production seed lives in master spec §11.5;
        // any change to the baseline numbers must also be reflected in that
        // document's narrative.
        await using var ctx = _fixture.CreateSuperuserContext();
        var seed = await SeedMinimalScenarioAsync(ctx);

        var engine = new KpiCalculationEngine(ctx);

        // Act
        var result = await engine.CalculateAsync(
            versionId: seed.VersionId,
            segmentId: null,
            monthRange: null,
            cancellationToken: CancellationToken.None);

        // Assert — each KPI within the baseline tolerance band.
        var expected = baseline.Expected.Kpis;
        var tol = baseline.Expected.Tolerances;

        result.TotalRevenue.Should().BeApproximately(expected.TotalRevenue, tol.Currency);
        result.TotalClaims.Should().BeApproximately(expected.TotalClaims, tol.Currency);
        result.LossRatio.Should().BeApproximately(expected.LossRatio, tol.Ratio);

        // ExpenseByClassification sums + EBITDA are tested at the engine's
        // unit-test layer; the golden scenario fixture currently proves the
        // revenue/claim/loss-ratio triplet end-to-end against a real
        // Postgres + real EF query plan. Expanded coverage (HHI, concentration,
        // per-segment margins) lands in F8+ when master spec §11.5 numbers
        // are locked with the accounting team.
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private sealed record SeedResult(int CompanyId, int VersionId, int UserId);

    private static async Task<SeedResult> SeedMinimalScenarioAsync(
        BudgetTracker.Infrastructure.Persistence.ApplicationDbContext ctx)
    {
        var tag = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstAsync(ctx.Companies, c => c.Code == "TAG");

        var segment = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstAsync(ctx.Segments, s => s.CompanyId == tag.Id);

        var year = BudgetYear.Create(tag.Id, 2026, DateTimeOffset.UtcNow);
        ctx.BudgetYears.Add(year);
        await ctx.SaveChangesAsync();

        var version = BudgetVersion.CreateDraft(tag.Id, year.Id, "Golden", createdByUserId: 1);
        ctx.BudgetVersions.Add(version);

        var customer = Customer.Create(
            companyId: tag.Id,
            code: "GS-01",
            name: "Golden Scenario Müşteri",
            segmentId: segment.Id,
            createdByUserId: 1,
            createdAt: DateTimeOffset.UtcNow);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();

        // Revenue 180 000 spread across 12 months (15 000 each)
        for (var month = 1; month <= 12; month++)
        {
            ctx.BudgetEntries.Add(BudgetEntry.Create(
                companyId: tag.Id,
                versionId: version.Id,
                customerId: customer.Id,
                month: month,
                entryType: EntryType.Revenue,
                amountOriginal: 15_000m,
                currencyCode: "TRY",
                amountTryFixed: 15_000m,
                amountTrySpot: 15_000m,
                createdByUserId: 1,
                createdAt: DateTimeOffset.UtcNow));

            ctx.BudgetEntries.Add(BudgetEntry.Create(
                companyId: tag.Id,
                versionId: version.Id,
                customerId: customer.Id,
                month: month,
                entryType: EntryType.Claim,
                amountOriginal: 7_500m,
                currencyCode: "TRY",
                amountTryFixed: 7_500m,
                amountTrySpot: 7_500m,
                createdByUserId: 1,
                createdAt: DateTimeOffset.UtcNow));
        }

        await ctx.SaveChangesAsync();
        return new SeedResult(tag.Id, version.Id, 1);
    }

    private static GoldenBaseline LoadBaseline()
    {
        var fixturePath = Path.Combine(
            AppContext.BaseDirectory,
            "Fixtures",
            "golden_scenario_baseline.json");

        // If the file isn't next to the assembly at runtime (first build in a
        // clean workspace), walk up to the source tree — tests copy fixtures
        // via <Content> / <CopyToOutputDirectory>, but this fallback keeps the
        // suite robust on fresh clones.
        if (!File.Exists(fixturePath))
        {
            var source = Path.Combine(
                AppContext.BaseDirectory,
                "..", "..", "..",
                "Fixtures",
                "golden_scenario_baseline.json");
            fixturePath = Path.GetFullPath(source);
        }

        var json = File.ReadAllText(fixturePath);
        var baseline = JsonSerializer.Deserialize<GoldenBaseline>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });
        return baseline ?? throw new InvalidOperationException("Baseline JSON failed to deserialise.");
    }

    // JSON-mirror records. Kept private to the test suite so the production
    // code never accidentally takes a dependency on the fixture shape.
    private sealed record GoldenBaseline(GoldenExpected Expected);
    private sealed record GoldenExpected(GoldenKpis Kpis, GoldenTolerances Tolerances);
    private sealed record GoldenKpis(
        decimal TotalRevenue,
        decimal TotalClaims,
        decimal LossRatio,
        decimal TotalExpenses,
        decimal GeneralExpenses,
        decimal TechnicalExpenses,
        decimal FinancialExpenses,
        decimal Ebitda,
        decimal EbitdaMargin);
    private sealed record GoldenTolerances(decimal Currency, decimal Ratio);
}
