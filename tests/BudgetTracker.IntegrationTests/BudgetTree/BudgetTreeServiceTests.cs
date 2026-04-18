using BudgetTracker.Application.BudgetTree;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.Infrastructure.Services;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.IntegrationTests.BudgetTree;

/// <summary>
/// BudgetTreeService + CustomerSummary integration tests — gerçek Postgres 16
/// üzerinde çalışır. Seed her testte resetlenir (Respawn).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class BudgetTreeServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public BudgetTreeServiceTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetAsync_AggregatesRevenueAndClaimBySegmentAndCustomer()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var seed = await SeedMinimalAsync(ctx, revenueMonthly: 10_000m, claimMonthly: 6_000m);

        var service = new BudgetTreeService(ctx);
        var tree = await service.GetAsync(seed.VersionId, CancellationToken.None);

        tree.Should().NotBeNull();
        tree.RevenueTotalTry.Should().Be(120_000m); // 10k × 12
        tree.ClaimTotalTry.Should().Be(72_000m);    // 6k × 12

        var segment = tree.Segments.Should().ContainSingle(s => s.SegmentId == seed.SegmentId).Subject;
        segment.Customers.Should().HaveCount(1);
        segment.RevenueTotalTry.Should().Be(120_000m);

        var customer = segment.Customers[0];
        customer.RevenueMonthlyTry.Should().HaveCount(12);
        customer.RevenueMonthlyTry.Should().AllBeEquivalentTo(10_000m);
        customer.LossRatioPercent.Should().Be(60m); // 72k / 120k
        customer.ActiveContractCount.Should().Be(0);
    }

    [Fact]
    public async Task GetAsync_IncludesOpexCategoriesWhenExpensesExist()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var seed = await SeedMinimalAsync(ctx, revenueMonthly: 5_000m, claimMonthly: 2_000m);

        var category = await ctx.ExpenseCategories.FirstAsync(c => c.CompanyId == seed.CompanyId);
        for (var month = 1; month <= 12; month++)
        {
            ctx.ExpenseEntries.Add(ExpenseEntry.Create(
                companyId: seed.CompanyId,
                versionId: seed.VersionId,
                budgetYearId: seed.BudgetYearId,
                categoryId: category.Id,
                month: month,
                entryType: ExpenseEntryType.Budget,
                amountOriginal: 1_000m,
                currencyCode: "TRY",
                amountTryFixed: 1_000m,
                amountTrySpot: 1_000m,
                createdByUserId: 1,
                createdAt: DateTimeOffset.UtcNow));
        }
        await ctx.SaveChangesAsync();

        var service = new BudgetTreeService(ctx);
        var tree = await service.GetAsync(seed.VersionId, CancellationToken.None);

        tree.OpexCategories.Should().NotBeEmpty();
        var opex = tree.OpexCategories.First(o => o.ExpenseCategoryId == category.Id);
        opex.TotalTry.Should().Be(12_000m);
        opex.MonthlyTry.Should().AllBeEquivalentTo(1_000m);
    }

    [Fact]
    public async Task GetCustomerSummaryAsync_CountsActiveContractsAndLossRatio()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var seed = await SeedMinimalAsync(ctx, revenueMonthly: 20_000m, claimMonthly: 5_000m);

        // 2 aktif + 1 pasif contract
        var category = ProductCategory.Create(
            seed.CompanyId, "TEST_CAT", "Test Kategori", 1, DateTimeOffset.UtcNow);
        ctx.ProductCategories.Add(category);
        await ctx.SaveChangesAsync();

        for (var i = 0; i < 3; i++)
        {
            var product = Product.Create(
                seed.CompanyId, category.Id, $"PROD{i}", $"Ürün {i}", i,
                DateTimeOffset.UtcNow);
            ctx.Products.Add(product);
            await ctx.SaveChangesAsync();

            var link = Contract.CreateFromLegacy(
                seed.CompanyId, seed.CustomerId,
                customerShortId: 1, productId: product.Id,
                createdAt: DateTimeOffset.UtcNow,
                unitPriceTry: null, startDate: null, endDate: null,
                notes: null, isActive: i != 2);
            ctx.Contracts.Add(link);
        }
        await ctx.SaveChangesAsync();

        var service = new BudgetTreeService(ctx);
        var summary = await service.GetCustomerSummaryAsync(
            seed.CustomerId, seed.VersionId, CancellationToken.None);

        summary.ActiveContractCount.Should().Be(2);
        summary.RevenueTotalTry.Should().Be(240_000m); // 20k × 12
        summary.ClaimTotalTry.Should().Be(60_000m);    // 5k × 12
        summary.LossRatioPercent.Should().Be(25m);     // 60k / 240k
    }

    [Fact]
    public async Task GetAsync_UnknownVersionId_Throws()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var service = new BudgetTreeService(ctx);

        var act = async () => await service.GetAsync(99_999, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*99999*");
    }

    private sealed record SeedResult(
        int CompanyId, int SegmentId, int CustomerId, int BudgetYearId, int VersionId);

    private static async Task<SeedResult> SeedMinimalAsync(
        BudgetTracker.Infrastructure.Persistence.ApplicationDbContext ctx,
        decimal revenueMonthly, decimal claimMonthly)
    {
        var tag = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var segment = await ctx.Segments.FirstAsync(s => s.CompanyId == tag.Id);

        var year = BudgetYear.Create(tag.Id, 2026, DateTimeOffset.UtcNow);
        ctx.BudgetYears.Add(year);
        await ctx.SaveChangesAsync();

        var version = BudgetVersion.CreateDraft(tag.Id, year.Id, "Tree Test", createdByUserId: 1);
        ctx.BudgetVersions.Add(version);

        var customer = Customer.Create(
            companyId: tag.Id,
            code: "TR-01",
            name: "Tree Test Müşteri",
            segmentId: segment.Id,
            createdByUserId: 1,
            createdAt: DateTimeOffset.UtcNow);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();

        for (var month = 1; month <= 12; month++)
        {
            ctx.BudgetEntries.Add(BudgetEntry.Create(
                companyId: tag.Id, versionId: version.Id, customerId: customer.Id,
                month: month, entryType: EntryType.Revenue,
                amountOriginal: revenueMonthly, currencyCode: "TRY",
                amountTryFixed: revenueMonthly, amountTrySpot: revenueMonthly,
                createdByUserId: 1, createdAt: DateTimeOffset.UtcNow));

            ctx.BudgetEntries.Add(BudgetEntry.Create(
                companyId: tag.Id, versionId: version.Id, customerId: customer.Id,
                month: month, entryType: EntryType.Claim,
                amountOriginal: claimMonthly, currencyCode: "TRY",
                amountTryFixed: claimMonthly, amountTrySpot: claimMonthly,
                createdByUserId: 1, createdAt: DateTimeOffset.UtcNow));
        }

        await ctx.SaveChangesAsync();
        return new SeedResult(tag.Id, segment.Id, customer.Id, year.Id, version.Id);
    }
}
