using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Customers;
using BudgetTracker.Core.Entities;
using BudgetTracker.Infrastructure.Audit;
using BudgetTracker.Infrastructure.Services;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace BudgetTracker.IntegrationTests.Customers;

/// <summary>
/// Mutabakat önkoşul #1 (00a) — Customer.external_customer_ref entegrasyon testleri.
/// Gerçek Postgres 16 üzerinde çalışır; koşullu UNIQUE index ve multi-tenant
/// yalıtımını doğrular.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class CustomerExternalRefTests : IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 4, 19, 12, 0, 0, TimeSpan.Zero);

    private readonly PostgresContainerFixture _fixture;

    public CustomerExternalRefTests(PostgresContainerFixture fixture) => _fixture = fixture;

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task LinkExternal_SameRefAcrossDifferentTenants_IsAllowed()
    {
        // Arrange — seed iki ayrı tenant + her birine 1 müşteri.
        // Respawn `companies` ve `segments` tablolarını reset etmez (seed tabloları),
        // o yüzden test sonunda manuel temizlik yapıyoruz — aksi halde sonraki
        // `MigrationTests.Migration_SeedsBaselineCurrenciesAndSegments` kırılır.
        await using var ctx = _fixture.CreateSuperuserContext();

        var tenantA = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var tenantB = Company.Create("TENANT-B", "İkinci Kiracı", "TRY", Now);
        ctx.Companies.Add(tenantB);
        await ctx.SaveChangesAsync();

        var segA = await ctx.Segments.FirstAsync(s => s.CompanyId == tenantA.Id);
        var segB = Segment.Create(tenantB.Id, "SEG-B", "Segment B", 1, Now);
        ctx.Segments.Add(segB);
        await ctx.SaveChangesAsync();

        try
        {
            var customerA = Customer.Create(tenantA.Id, "A-01", "Müşteri A", segA.Id, 1, Now);
            var customerB = Customer.Create(tenantB.Id, "B-01", "Müşteri B", segB.Id, 1, Now);
            ctx.Customers.Add(customerA);
            ctx.Customers.Add(customerB);
            await ctx.SaveChangesAsync();

            // Act — aynı external_customer_ref kodunu her iki tenant'taki müşteriye bağla.
            customerA.LinkExternalRef("1500003063", "LOGO", 1, Now);
            customerB.LinkExternalRef("1500003063", "LOGO", 1, Now);
            await ctx.SaveChangesAsync();

            // Assert — koşullu UNIQUE per (company_id, external_customer_ref) olduğu için
            // farklı tenant'larda aynı kod tutulur.
            var countA = await ctx.Customers.CountAsync(
                c => c.CompanyId == tenantA.Id && c.ExternalCustomerRef == "1500003063");
            var countB = await ctx.Customers.CountAsync(
                c => c.CompanyId == tenantB.Id && c.ExternalCustomerRef == "1500003063");

            countA.Should().Be(1);
            countB.Should().Be(1);
        }
        finally
        {
            // Teardown — Respawn'ın atladığı seed tablolarını geri getir.
            await using var cleanup = _fixture.CreateSuperuserContext();
            await cleanup.Database.ExecuteSqlRawAsync(
                "DELETE FROM customers WHERE company_id = {0}", tenantB.Id);
            await cleanup.Database.ExecuteSqlRawAsync(
                "DELETE FROM segments WHERE id = {0}", segB.Id);
            await cleanup.Database.ExecuteSqlRawAsync(
                "DELETE FROM companies WHERE id = {0}", tenantB.Id);
        }
    }

    [Fact]
    public async Task LinkExternal_DuplicateRefWithinSameTenant_ThrowsUniqueViolation()
    {
        // Arrange — aynı tenant'ta 2 müşteri.
        await using var ctx = _fixture.CreateSuperuserContext();
        var tag = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var seg = await ctx.Segments.FirstAsync(s => s.CompanyId == tag.Id);

        var c1 = Customer.Create(tag.Id, "DUP-01", "İlk", seg.Id, 1, Now);
        var c2 = Customer.Create(tag.Id, "DUP-02", "İkinci", seg.Id, 1, Now);
        ctx.Customers.Add(c1);
        ctx.Customers.Add(c2);
        await ctx.SaveChangesAsync();

        c1.LinkExternalRef("9999", "LOGO", 1, Now);
        await ctx.SaveChangesAsync();

        // Act + Assert — ikinciye aynı ref atanırsa UNIQUE ihlali fırlatılır.
        c2.LinkExternalRef("9999", "LOGO", 1, Now);
        var act = async () => await ctx.SaveChangesAsync();

        var ex = await act.Should().ThrowAsync<DbUpdateException>();
        ex.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);
    }

    [Fact]
    public async Task LinkExternal_AfterSoftDelete_SameRefReusable()
    {
        // Koşullu UNIQUE filtresi "deleted_at IS NULL" içeriyor — soft-delete
        // edilmiş bir müşterinin ref'i, aynı tenant'taki aktif bir müşteriye
        // yeniden bağlanabilmeli (Faz 1 backfill senaryosu: yanlış müşteriye
        // atanmış ref'i düzeltme).
        await using var ctx = _fixture.CreateSuperuserContext();
        var tag = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var seg = await ctx.Segments.FirstAsync(s => s.CompanyId == tag.Id);

        var old = Customer.Create(tag.Id, "OLD-01", "Eski", seg.Id, 1, Now);
        var fresh = Customer.Create(tag.Id, "NEW-01", "Yeni", seg.Id, 1, Now);
        ctx.Customers.Add(old);
        ctx.Customers.Add(fresh);
        await ctx.SaveChangesAsync();

        old.LinkExternalRef("5555", "MANUAL", 1, Now);
        await ctx.SaveChangesAsync();

        old.MarkDeleted(1, Now);
        await ctx.SaveChangesAsync();

        // Aynı ref'i aktif müşteriye ata — izin verilmeli.
        fresh.LinkExternalRef("5555", "MANUAL", 1, Now);
        await ctx.SaveChangesAsync();

        var activeMatch = await ctx.Customers
            .Where(c => c.CompanyId == tag.Id && c.ExternalCustomerRef == "5555")
            .Select(c => c.Code)
            .SingleAsync();
        activeMatch.Should().Be("NEW-01");
    }

    [Fact]
    public async Task LookupByExternalRef_UnknownRef_ReturnsNull()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var tenant = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var audit = BuildAuditLogger();

        var service = new CustomerService(
            ctx,
            new TestTenantContext(tenant.Id),
            new FixedClock(Now),
            audit);

        var result = await service.LookupByExternalRefAsync("does-not-exist", CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task LookupByExternalRef_KnownRef_ReturnsCustomer()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var tenant = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var seg = await ctx.Segments.FirstAsync(s => s.CompanyId == tenant.Id);

        var customer = Customer.Create(tenant.Id, "LK-01", "Lookup Test", seg.Id, 1, Now);
        customer.LinkExternalRef("1500007788", "MIKRO", 1, Now);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();

        var service = new CustomerService(
            ctx,
            new TestTenantContext(tenant.Id),
            new FixedClock(Now),
            BuildAuditLogger());

        var result = await service.LookupByExternalRefAsync("1500007788", CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(customer.Id);
        result.Code.Should().Be("LK-01");
        result.ExternalCustomerRef.Should().Be("1500007788");
        result.ExternalSourceSystem.Should().Be("MIKRO");
    }

    [Fact]
    public async Task LinkExternalAsync_WritesCustomerExternalRefLinkedAuditEntry()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        var tenant = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var seg = await ctx.Segments.FirstAsync(s => s.CompanyId == tenant.Id);

        var customer = Customer.Create(tenant.Id, "AU-01", "Audit Test", seg.Id, 1, Now);
        ctx.Customers.Add(customer);
        await ctx.SaveChangesAsync();

        var audit = BuildAuditLogger();
        var service = new CustomerService(
            ctx,
            new TestTenantContext(tenant.Id),
            new FixedClock(Now),
            audit);

        await service.LinkExternalAsync(
            customer.Id,
            new LinkExternalCustomerRequest("1500009999", "LOGO"),
            actorUserId: 42,
            CancellationToken.None);

        await using var conn = new NpgsqlConnection(_fixture.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT count(*) FROM audit_logs_2026_04
             WHERE action = 'CUSTOMER_EXTERNAL_REF_LINKED'
               AND entity_name = 'Customer'
               AND user_id = 42
               AND company_id = @cid
            """;
        cmd.Parameters.AddWithValue("cid", tenant.Id);
        var count = (long)(await cmd.ExecuteScalarAsync())!;
        count.Should().Be(1, "link-external audit event persisted");
    }

    private AuditLogger BuildAuditLogger() => new(
        new TestDbContextFactory(() => _fixture.CreateSuperuserContext()),
        new FixedClock(Now),
        NullLogger<AuditLogger>.Instance);
}
