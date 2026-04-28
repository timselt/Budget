using BudgetTracker.Application.BudgetEntries;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.Infrastructure.FxRates;
using BudgetTracker.Infrastructure.Services;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.IntegrationTests.Persistence;

/// <summary>
/// Pins the round-trip behavior for <see cref="BudgetEntry.Quantity"/> through the
/// upsert API. Quantity already exists on the entity (ADR-0013 §5) and DB schema;
/// this contract verifies the Application/DTO/Service surface preserves it. RED for
/// Tasks 1.1–1.3 until <see cref="BudgetEntryUpsert"/> + service + DTO carry the field.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class BudgetEntryRoundtripTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public BudgetEntryRoundtripTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task BulkUpsertWithQuantity_PersistsAndReturnsQuantity()
    {
        var seed = await SeedDraftBudgetAsync();

        await using var ctx = _fixture.CreateSuperuserContext(
            new TestTenantContext(seed.CompanyId));
        var service = BuildService(ctx, seed.CompanyId);

        var request = new BulkUpdateBudgetEntriesRequest(new[]
        {
            new BudgetEntryUpsert(
                Id: null,
                CustomerId: seed.CustomerId,
                Month: 1,
                EntryType: "REVENUE",
                AmountOriginal: 5500m,
                CurrencyCode: "TRY",
                ContractId: seed.ContractId,
                ProductId: null,
                Quantity: 10),
        });

        var saved = await service.BulkUpsertAsync(seed.VersionId, request, actorUserId: 1, default);

        saved.Should().HaveCount(1);
        saved[0].Quantity.Should().Be(10);
        saved[0].AmountOriginal.Should().Be(5500m);

        await using var verifyCtx = _fixture.CreateSuperuserContext();
        var reread = await verifyCtx.BudgetEntries
            .AsNoTracking()
            .FirstAsync(e => e.Id == saved[0].Id);
        reread.Quantity.Should().Be(10);
    }

    [Fact]
    public async Task BulkUpsertWithoutQuantity_PersistsAsNull()
    {
        var seed = await SeedDraftBudgetAsync();

        await using var ctx = _fixture.CreateSuperuserContext(
            new TestTenantContext(seed.CompanyId));
        var service = BuildService(ctx, seed.CompanyId);

        var request = new BulkUpdateBudgetEntriesRequest(new[]
        {
            new BudgetEntryUpsert(
                Id: null,
                CustomerId: seed.CustomerId,
                Month: 2,
                EntryType: "REVENUE",
                AmountOriginal: 6600m,
                CurrencyCode: "TRY",
                ContractId: seed.ContractId,
                ProductId: null,
                Quantity: null),
        });

        var saved = await service.BulkUpsertAsync(seed.VersionId, request, actorUserId: 1, default);

        saved.Should().HaveCount(1);
        saved[0].Quantity.Should().BeNull();
    }

    private static BudgetEntryService BuildService(
        BudgetTracker.Infrastructure.Persistence.ApplicationDbContext ctx,
        int companyId)
    {
        var fx = new FxConversionService(ctx);
        var tenant = new TestTenantContext(companyId);
        var clock = new FixedClock(DateTimeOffset.UtcNow);
        return new BudgetEntryService(ctx, fx, tenant, clock);
    }

    private async Task<SeedResult> SeedDraftBudgetAsync()
    {
        await using var ctx = _fixture.CreateSuperuserContext();

        var tag = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var segment = await ctx.Segments.FirstAsync(s => s.CompanyId == tag.Id);

        var year = BudgetYear.Create(tag.Id, 2026, DateTimeOffset.UtcNow);
        ctx.BudgetYears.Add(year);
        await ctx.SaveChangesAsync();

        var version = BudgetVersion.CreateDraft(tag.Id, year.Id, "Roundtrip Test", createdByUserId: 1);
        ctx.BudgetVersions.Add(version);

        var customer = Customer.Create(
            companyId: tag.Id,
            code: "RT-01",
            name: "Roundtrip Test Müşteri",
            segmentId: segment.Id,
            createdByUserId: 1,
            createdAt: DateTimeOffset.UtcNow);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();

        var category = ProductCategory.Create(
            tag.Id, "RT_CAT", "Roundtrip Kategori", 1, DateTimeOffset.UtcNow);
        ctx.ProductCategories.Add(category);
        await ctx.SaveChangesAsync();

        var product = Product.Create(
            tag.Id, category.Id, "RT_PROD", "Roundtrip Ürün", 1, DateTimeOffset.UtcNow);
        ctx.Products.Add(product);
        await ctx.SaveChangesAsync();

        var contract = Contract.CreateFromLegacy(
            companyId: tag.Id,
            customerId: customer.Id,
            customerShortId: 1,
            productId: product.Id,
            createdAt: DateTimeOffset.UtcNow,
            unitPriceTry: 550m,
            startDate: null,
            endDate: null,
            notes: null,
            isActive: true);
        ctx.Contracts.Add(contract);
        await ctx.SaveChangesAsync();

        return new SeedResult(tag.Id, version.Id, customer.Id, contract.Id);
    }

    private sealed record SeedResult(int CompanyId, int VersionId, int CustomerId, int ContractId);
}
