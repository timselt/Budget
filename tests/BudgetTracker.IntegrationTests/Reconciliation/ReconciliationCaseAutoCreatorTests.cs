using System.Text;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Application.Reconciliation.Lines;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Reconciliation;
using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Reconciliation.Batches;
using BudgetTracker.Infrastructure.Reconciliation.Cases;
using BudgetTracker.Infrastructure.Reconciliation.Import;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace BudgetTracker.IntegrationTests.Reconciliation;

/// <summary>
/// Sprint 2 Task 4 — Case auto-creation integration testleri.
/// Gerçek Postgres (Testcontainers) + real BatchService + real AutoCreator;
/// audit mocked.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ReconciliationCaseAutoCreatorTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public ReconciliationCaseAutoCreatorTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync() => _fixture.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private const string InsuranceCsvAllMatched = """
        policy_no,insured_party_name,product_code,product_name,quantity,unit_price_expected,period_code,external_customer_ref,notes
        POL-001,Ali Veli,PKT-STD,Standart Paket,1,125.00,2026-04,LOGO-MAPFRE,
        POL-002,Mehmet Demir,PKT-STD,Standart Paket,1,125.00,2026-04,LOGO-MAPFRE,
        POL-003,Ayse Yilmaz,PKT-PREMIUM,Premium Paket,1,285.00,2026-04,LOGO-MAPFRE,
        POL-004,Can Oz,PKT-STD,Standart Paket,1,135.00,2026-04,LOGO-AKSIGORTA,
        POL-005,Elif Ak,PKT-PREMIUM,Premium Paket,1,295.00,2026-04,LOGO-AKSIGORTA,
        """;

    private const string InsuranceCsvPartialUnmatched = """
        policy_no,insured_party_name,product_code,product_name,quantity,unit_price_expected,period_code,external_customer_ref,notes
        POL-001,Ali Veli,PKT-STD,Standart Paket,1,125.00,2026-04,LOGO-MAPFRE,
        POL-002,Mehmet Demir,PKT-STD,Standart Paket,1,125.00,2026-04,LOGO-UNKNOWN-1,
        POL-003,Ayse Yilmaz,PKT-PREMIUM,Premium Paket,1,285.00,2026-04,LOGO-UNKNOWN-2,
        """;

    [Fact]
    public async Task AutoCreate_TwoMatchedCustomers_CreatesTwoCasesAndFiveLines()
    {
        // Arrange — company + 2 customer (MAPFRE 3 row, AKSIGORTA 2 row).
        var (companyId, userId) = await SeedCompanyWithCustomersAsync(new[]
        {
            ("MAPFRE", "Mapfre Sigorta", "LOGO-MAPFRE"),
            ("AKSIGORTA", "AK Sigorta", "LOGO-AKSIGORTA"),
        });
        var (service, _) = MakeService(companyId);

        // Act
        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsvAllMatched));
        var detail = await service.ImportAsync(
            fileStream: stream, fileName: "pilot.csv",
            flow: ReconciliationFlow.Insurance, periodCode: "2026-04",
            sourceType: ReconciliationSourceType.InsurerList,
            companyId: companyId, importedByUserId: userId,
            notes: null, cancellationToken: CancellationToken.None);

        // Assert — DB state
        await using var ctx = _fixture.CreateSuperuserContext();
        var cases = await ctx.ReconciliationCases
            .Where(c => c.CompanyId == companyId).ToListAsync();
        cases.Should().HaveCount(2);
        cases.Should().OnlyContain(c =>
            c.Flow == ReconciliationFlow.Insurance
            && c.PeriodCode == "2026-04"
            && c.Status == ReconciliationCaseStatus.Draft);

        var lines = await ctx.ReconciliationLines
            .Where(l => cases.Select(c => c.Id).Contains(l.CaseId)).ToListAsync();
        lines.Should().HaveCount(5);
        lines.Should().OnlyContain(l =>
            l.UnitPrice == 0m
            && l.Status == ReconciliationLineStatus.PendingReview);
    }

    [Fact]
    public async Task AutoCreate_PartialUnmatched_CreatesOneCaseAndSkipsTwoRows()
    {
        var (companyId, userId) = await SeedCompanyWithCustomersAsync(new[]
        {
            ("MAPFRE", "Mapfre Sigorta", "LOGO-MAPFRE"),
        });
        var (service, _) = MakeService(companyId);

        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsvPartialUnmatched));
        var detail = await service.ImportAsync(
            fileStream: stream, fileName: "partial.csv",
            flow: ReconciliationFlow.Insurance, periodCode: "2026-04",
            sourceType: ReconciliationSourceType.InsurerList,
            companyId: companyId, importedByUserId: userId,
            notes: null, cancellationToken: CancellationToken.None);

        await using var ctx = _fixture.CreateSuperuserContext();
        var cases = await ctx.ReconciliationCases
            .Where(c => c.CompanyId == companyId).ToListAsync();
        cases.Should().HaveCount(1, "yalnızca MAPFRE müşterisi eşleşti");

        var lines = await ctx.ReconciliationLines
            .Where(l => cases.Select(c => c.Id).Contains(l.CaseId)).ToListAsync();
        lines.Should().HaveCount(1, "3 satırdan sadece 1'i MAPFRE");

        // SourceRow'lar hepsi kayıtlı (unmatched dahil), ama 2'si Case dışında kaldı
        var allSourceRows = await ctx.ReconciliationSourceRows
            .Where(r => r.BatchId == detail.Id).ToListAsync();
        allSourceRows.Should().HaveCount(3);
    }

    [Fact]
    public async Task AutoCreate_IdempotentRerun_DoesNotDuplicateCases()
    {
        var (companyId, userId) = await SeedCompanyWithCustomersAsync(new[]
        {
            ("MAPFRE", "Mapfre Sigorta", "LOGO-MAPFRE"),
            ("AKSIGORTA", "AK Sigorta", "LOGO-AKSIGORTA"),
        });
        var (service, _) = MakeService(companyId);

        // İlk import — auto-creation normal çalışır.
        await using var stream1 = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsvAllMatched));
        var firstDetail = await service.ImportAsync(
            fileStream: stream1, fileName: "pilot.csv",
            flow: ReconciliationFlow.Insurance, periodCode: "2026-04",
            sourceType: ReconciliationSourceType.InsurerList,
            companyId: companyId, importedByUserId: userId,
            notes: null, cancellationToken: CancellationToken.None);

        // Idempotent re-run simülasyonu: aynı case customer+period+flow için
        // autoCreator tekrar çağrılırsa yeni Case yaratmamalı.
        await using var ctx = _fixture.CreateSuperuserContext();
        var noopResolver = Substitute.For<ILinePricingResolver>();
        var noopAudit = Substitute.For<IAuditLogger>();
        var autoCreator = new ReconciliationCaseAutoCreator(
            ctx, TimeProvider.System, noopResolver, noopAudit);
        var rerun = await autoCreator.CreateCasesForBatchAsync(
            firstDetail.Id, companyId, userId, CancellationToken.None);

        rerun.CreatedCaseIds.Should().BeEmpty("mevcut case'ler yeniden kullanıldı");
        rerun.TotalLinesCreated.Should().Be(5, "5 yeni Line yine üretildi — duplicate line koruması yok (SourceRow farklı olmadığından design olarak OK)");

        // Ama Case sayısı değişmemeli.
        var caseCount = await ctx.ReconciliationCases
            .CountAsync(c => c.CompanyId == companyId);
        caseCount.Should().Be(2);
    }

    // --- Helpers ---

    private async Task<(int companyId, int userId)> SeedCompanyWithCustomersAsync(
        (string code, string name, string externalRef)[] customers)
    {
        // Migration seed'inden gelen TAG company + segment kullanılır (diğer
        // integration testlerle aynı pattern — Respawn companies/segments'i
        // reset etmez).
        await using var ctx = _fixture.CreateSuperuserContext();
        var tag = await ctx.Companies.FirstAsync(c => c.Code == "TAG");
        var seg = await ctx.Segments.FirstAsync(s => s.CompanyId == tag.Id);
        var now = DateTimeOffset.UtcNow;

        foreach (var (code, name, externalRef) in customers)
        {
            var customer = Customer.Create(tag.Id, code, name, seg.Id, 1, now);
            customer.LinkExternalRef(externalRef, "LOGO", 1, now);
            ctx.Customers.Add(customer);
        }
        await ctx.SaveChangesAsync(CancellationToken.None);

        return (tag.Id, 1);
    }

    private (ReconciliationBatchService service, IAuditLogger auditMock) MakeService(int companyId)
    {
        var tenant = new TestTenantContext(companyId);
        var ctx = _fixture.CreateSuperuserContext(tenant);
        var xlsxReader = new XlsxStreamReader();
        var csvReader = new CsvStreamReader();
        var parser = new ReconciliationImportParser(xlsxReader, csvReader);
        var audit = Substitute.For<IAuditLogger>();
        var time = TimeProvider.System;
        // No-op pricing resolver — Task 4 testleri Line status/unit_price default'larına
        // dayanır (PendingReview + 0). Task 5 testleri ayrı fixture ile gerçek
        // PricingLookupService kullanır.
        var resolver = Substitute.For<ILinePricingResolver>();
        var autoCreator = new ReconciliationCaseAutoCreator(ctx, time, resolver, audit);
        return (new ReconciliationBatchService(ctx, parser, audit, time, autoCreator), audit);
    }

    private sealed class TestTenantContext(int companyId) : ITenantContext
    {
        public int? CurrentCompanyId => companyId;
        public int? CurrentUserId => 1;
        public bool BypassFilter => false;
    }
}
