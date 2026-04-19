using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Contracts;
using BudgetTracker.Core.Enums.PriceBooks;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BudgetTracker.IntegrationTests.Persistence;

/// <summary>
/// 00b Mutabakat önkoşul migration integration testleri: tablolar + EXCLUDE
/// USING gist constraint (aynı Contract için tek Active PriceBook) + lookup
/// algoritması happy path.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class PriceBookMigrationTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public PriceBookMigrationTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Migration_CreatesPriceBookTablesAndConstraint()
    {
        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();

        await using var tablesCmd = conn.CreateCommand();
        tablesCmd.CommandText = @"
            SELECT tablename FROM pg_tables
            WHERE schemaname='public' AND tablename IN ('price_books','price_book_items')
            ORDER BY tablename;";
        var tables = new List<string>();
        await using (var reader = await tablesCmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
        }
        tables.Should().BeEquivalentTo(new[] { "price_book_items", "price_books" });

        await using var constraintCmd = conn.CreateCommand();
        constraintCmd.CommandText = @"
            SELECT conname FROM pg_constraint
            WHERE conname = 'ux_price_books_active_contract_range';";
        var constraintName = await constraintCmd.ExecuteScalarAsync() as string;
        constraintName.Should().Be("ux_price_books_active_contract_range");
    }

    [Fact]
    public async Task ExcludeConstraint_BlocksOverlappingActivePriceBooks()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var (_, contract) = await SeedContractAsync(ctx, code: "EXC-1");

        var pb1 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 1,
            effectiveFrom: new DateOnly(2026, 1, 1),
            effectiveTo: new DateOnly(2026, 12, 31),
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb1.AddItem(MakeItem("A"));
        pb1.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb1);
        await ctx.SaveChangesAsync();

        // Overlap (2026-06-01 ~ 2027-05-31) — should be rejected by EXCLUDE.
        var pb2 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 2,
            effectiveFrom: new DateOnly(2026, 6, 1),
            effectiveTo: new DateOnly(2027, 5, 31),
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb2.AddItem(MakeItem("B"));
        pb2.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb2);

        var act = async () => await ctx.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>()
            .Where(e => e.InnerException is PostgresException);
    }

    [Fact]
    public async Task ExcludeConstraint_AllowsNonOverlappingActivePriceBooks()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var (_, contract) = await SeedContractAsync(ctx, code: "EXC-2");

        var pb1 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 1,
            effectiveFrom: new DateOnly(2026, 1, 1),
            effectiveTo: new DateOnly(2026, 5, 31),
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb1.AddItem(MakeItem("A"));
        pb1.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb1);
        await ctx.SaveChangesAsync();

        var pb2 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 2,
            effectiveFrom: new DateOnly(2026, 6, 1),
            effectiveTo: new DateOnly(2026, 12, 31),
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb2.AddItem(MakeItem("B"));
        pb2.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb2);

        var act = async () => await ctx.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ExcludeConstraint_AllowsArchivedPlusActiveOverlap()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var (_, contract) = await SeedContractAsync(ctx, code: "EXC-3");

        // Önceki sürüm Active → Archived yapılır.
        var pb1 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 1,
            effectiveFrom: new DateOnly(2026, 1, 1),
            effectiveTo: null,
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb1.AddItem(MakeItem("A"));
        pb1.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb1);
        await ctx.SaveChangesAsync();

        // Archive eski sürümü
        pb1.Archive(actorUserId: 1, updatedAt: DateTimeOffset.UtcNow,
            archiveOn: new DateOnly(2026, 5, 31));
        await ctx.SaveChangesAsync();

        // Yeni Active sürüm aynı tarih bandında (Archived ile overlap) — izin verilir.
        var pb2 = PriceBook.Create(
            contract.CompanyId, contract.Id, versionNo: 2,
            effectiveFrom: new DateOnly(2026, 5, 1),
            effectiveTo: null,
            createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
        pb2.AddItem(MakeItem("B"));
        pb2.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);
        ctx.PriceBooks.Add(pb2);

        var act = async () => await ctx.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    private static async Task<(Company company, Contract contract)> SeedContractAsync(
        Infrastructure.Persistence.ApplicationDbContext ctx, string code)
    {
        var company = await ctx.Companies.FirstOrDefaultAsync(c => c.Code == "TAG")
            ?? AddAndSave(ctx, Company.Create("TAG", "Tur Assist", "TRY", DateTimeOffset.UtcNow));

        var segment = await ctx.Segments.FirstAsync();

        var customer = Customer.Create(
            company.Id, code: $"CUST-{code}", name: $"Customer {code}",
            segmentId: segment.Id, createdByUserId: 1, createdAt: DateTimeOffset.UtcNow);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();
        customer.AssignShortId(shortId: 1, actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        var category = await ctx.ProductCategories.FirstOrDefaultAsync()
            ?? AddAndSave(ctx, ProductCategory.Create(
                company.Id, code: "TEST", name: "Test Category",
                displayOrder: 0, createdAt: DateTimeOffset.UtcNow));

        var product = Product.Create(
            company.Id, productCategoryId: category.Id,
            code: $"PROD-{code}", name: $"Product {code}",
            displayOrder: 0, createdAt: DateTimeOffset.UtcNow);
        ctx.Products.Add(product);
        await ctx.SaveChangesAsync();

        var contract = Contract.Create(
            company.Id, customer.Id, customer.ShortId, product.Id,
            BusinessLine.RoadSideAssistance, SalesType.Insurance,
            Core.Enums.Contracts.ProductType.Kasko, VehicleType.Binek,
            ContractForm.Risky, Core.Enums.Contracts.ContractType.PerPolicy,
            PaymentFrequency.Daily, AdjustmentClause.WithoutClause,
            ContractKind.CleanCut, ServiceArea.Domestic,
            createdAt: DateTimeOffset.UtcNow, createdByUserId: null,
            startDate: new DateOnly(2026, 1, 1));
        ctx.Contracts.Add(contract);
        await ctx.SaveChangesAsync();

        return (company, contract);
    }

    private static T AddAndSave<T>(Infrastructure.Persistence.ApplicationDbContext ctx, T entity) where T : class
    {
        ctx.Add(entity);
        ctx.SaveChanges();
        return entity;
    }

    private static PriceBookItem MakeItem(string code) => PriceBookItem.Create(
        priceBookId: 0, productCode: code, productName: $"Prod {code}",
        itemType: PriceBookItemType.InsurancePackage, unit: "USE",
        unitPrice: 100m, currencyCode: "TRY",
        createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
}
