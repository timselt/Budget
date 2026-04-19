using System.Text;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Reconciliation;
using BudgetTracker.Infrastructure.Reconciliation.Batches;
using BudgetTracker.Infrastructure.Reconciliation.Import;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace BudgetTracker.IntegrationTests.Reconciliation;

/// <summary>
/// ReconciliationBatchService.ImportAsync end-to-end: parser → DB persist
/// (Batch + SourceRows) → audit log. Real Postgres (Testcontainers) +
/// real parser stack; sadece IAuditLogger mock'lu (audit içeriği assertion).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ReconciliationBatchServiceTests : IAsyncLifetime
{
    private readonly PostgresContainerFixture _fixture;

    public ReconciliationBatchServiceTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync() => _fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    // CSV ayraç: comma. TR ondalık (virgül) field içinde çakışmasın diye
    // unit_price_expected EN locale (nokta) veya tırnak içinde olmalı.
    // TR locale toleransı unit test'lerde ayrı doğrulanıyor (TemplateRowValidatorTests).
    private const string InsuranceCsv = """
        policy_no,insured_party_name,product_code,product_name,quantity,unit_price_expected,period_code,external_customer_ref,notes
        POL-001,Ali Veli,KSK-STD,Kasko Standart,1,1250.00,2026-04,LOGO-100,
        POL-002,Mehmet Demir,KSK-STD,Kasko Standart,1,1250.00,2026-04,LOGO-100,ek not
        POL-003,Ayse Yilmaz,KSK-PLUS,Kasko Plus,1,1875.50,2026-04,LOGO-100,EN ondalik
        """;

    [Fact]
    public async Task ImportAsync_ValidInsuranceCsv_PersistsBatchAndSourceRows()
    {
        var (companyId, userId) = await SeedCompanyAsync();
        var (service, audit) = MakeService(companyId);

        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsv));
        var detail = await service.ImportAsync(
            fileStream: stream,
            fileName: "anadolu_2026_04.csv",
            flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04",
            sourceType: ReconciliationSourceType.InsurerList,
            companyId: companyId,
            importedByUserId: userId,
            notes: "Test import",
            cancellationToken: CancellationToken.None);

        detail.Status.Should().Be(ReconciliationBatchStatus.Parsed);
        detail.RowCount.Should().Be(3);
        detail.OkCount.Should().Be(3);
        detail.ErrorCount.Should().Be(0);
        detail.SourceFileHash.Length.Should().Be(64);

        // DB doğrulama
        await using var ctx = _fixture.CreateSuperuserContext();
        var batch = await ctx.ReconciliationBatches.FirstOrDefaultAsync(
            b => b.Id == detail.Id, CancellationToken.None);
        batch.Should().NotBeNull();
        batch!.CompanyId.Should().Be(companyId);
        batch.SourceFileHash.Should().Be(detail.SourceFileHash);

        var rows = await ctx.ReconciliationSourceRows
            .Where(r => r.BatchId == detail.Id)
            .OrderBy(r => r.RowNumber)
            .ToListAsync(CancellationToken.None);
        rows.Should().HaveCount(3);
        rows[0].ParseStatus.Should().Be(ReconciliationParseStatus.Ok);
        rows[0].ExternalCustomerRef.Should().Be("LOGO-100");
        rows[0].ExternalDocumentRef.Should().Be("POL-001");
        rows[0].RawPayload.Should().Contain("POL-001");

        // Audit
        await audit.Received(1).LogAsync(
            Arg.Is<AuditEvent>(e =>
                e.Action == AuditActions.ReconciliationBatchImported
                && e.EntityName == AuditEntityNames.ReconciliationBatch
                && e.EntityKey == detail.Id.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ImportAsync_DuplicateHash_ThrowsDuplicateImportException()
    {
        var (companyId, userId) = await SeedCompanyAsync();
        var (service, _) = MakeService(companyId);

        // İlk import
        await using var stream1 = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsv));
        var first = await service.ImportAsync(
            stream1, "first.csv", ReconciliationFlow.Insurance, "2026-04",
            ReconciliationSourceType.InsurerList, companyId, userId, null,
            CancellationToken.None);

        // Aynı içerik, farklı dosya adı — hash aynı, exception bekliyor
        await using var stream2 = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsv));
        var act = async () => await service.ImportAsync(
            stream2, "second.csv", ReconciliationFlow.Insurance, "2026-04",
            ReconciliationSourceType.InsurerList, companyId, userId, null,
            CancellationToken.None);

        var ex = await act.Should().ThrowAsync<DuplicateImportException>();
        ex.Which.ExistingBatchId.Should().Be(first.Id);
    }

    [Fact]
    public async Task ImportAsync_RowWithMissingRequired_KeepsBatchAndStatusError()
    {
        var (companyId, userId) = await SeedCompanyAsync();
        var (service, _) = MakeService(companyId);

        // 2. satırda product_code boş (zorunlu) → Error; batch düşmemeli
        const string csv = """
            policy_no,insured_party_name,product_code,product_name,quantity,period_code,external_customer_ref
            POL-100,Ali,KSK,Kasko,1,2026-04,LOGO-1
            POL-101,Veli,,Kasko,1,2026-04,LOGO-1
            POL-102,Ayşe,KSK,Kasko,1,2026-04,LOGO-1
            """;
        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var detail = await service.ImportAsync(
            stream, "partial.csv", ReconciliationFlow.Insurance, "2026-04",
            ReconciliationSourceType.InsurerList, companyId, userId, null,
            CancellationToken.None);

        detail.Status.Should().Be(ReconciliationBatchStatus.Parsed);
        detail.RowCount.Should().Be(3);
        detail.OkCount.Should().Be(2);
        detail.ErrorCount.Should().Be(1);
    }

    [Fact]
    public async Task ListAsync_FiltersAndScopesByCompany()
    {
        var (companyId, userId) = await SeedCompanyAsync();
        var (service, _) = MakeService(companyId);

        await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(InsuranceCsv));
        await service.ImportAsync(
            stream, "list-test.csv", ReconciliationFlow.Insurance, "2026-04",
            ReconciliationSourceType.InsurerList, companyId, userId, null,
            CancellationToken.None);

        var all = await service.ListAsync(
            new Application.Reconciliation.Batches.BatchListQuery(), companyId,
            CancellationToken.None);
        all.Should().HaveCountGreaterThanOrEqualTo(1);
        all.Should().AllSatisfy(b => b.Flow.Should().Be(ReconciliationFlow.Insurance));

        // Yanlış flow filtresi → boş
        var auto = await service.ListAsync(
            new Application.Reconciliation.Batches.BatchListQuery(Flow: ReconciliationFlow.Automotive),
            companyId, CancellationToken.None);
        auto.Should().BeEmpty();
    }

    private async Task<(int companyId, int userId)> SeedCompanyAsync()
    {
        await using var ctx = _fixture.CreateSuperuserContext();
        // Her reset sonrası farklı kod gerekiyor olabilir → timestamp suffix.
        var code = $"TST{DateTimeOffset.UtcNow.Ticks % 100000}";
        var company = Company.Create(
            code: code,
            name: "Test Şirket",
            baseCurrencyCode: "TRY",
            createdAt: DateTimeOffset.UtcNow);
        ctx.Companies.Add(company);
        await ctx.SaveChangesAsync(CancellationToken.None);
        return (company.Id, 1);
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
        return (new ReconciliationBatchService(ctx, parser, audit, time), audit);
    }

    private sealed class TestTenantContext(int companyId) : ITenantContext
    {
        public int? CurrentCompanyId => companyId;
        public int? CurrentUserId => 1;
        public bool BypassFilter => false;
    }
}
