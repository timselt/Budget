using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Imports;
using BudgetTracker.Application.Reports;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.Infrastructure.Persistence;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Reports;

/// <summary>
/// ADR-0008 §2.1 implementation. Preview/commit split, tenant stream limits,
/// advisory-lock concurrency guard, and audit events for every lifecycle edge.
/// </summary>
public sealed class ExcelImportService : IExcelImportService
{
    // Concrete context: CommitAsync needs access to Database.BeginTransactionAsync
    // for the advisory-lock scope, which IApplicationDbContext does not expose.
    private readonly ApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly IImportGuard _importGuard;
    private readonly IAuditLogger _auditLogger;
    private readonly ILogger<ExcelImportService> _logger;

    public ExcelImportService(
        ApplicationDbContext db,
        IClock clock,
        IImportGuard importGuard,
        IAuditLogger auditLogger,
        ILogger<ExcelImportService> logger)
    {
        _db = db;
        _clock = clock;
        _importGuard = importGuard;
        _auditLogger = auditLogger;
        _logger = logger;
    }

    public async Task<ExcelImportPreview> PreviewAsync(
        int versionId,
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await LoadVersionForImportAsync(versionId, cancellationToken);

        await EnforceLimitsAsync(
            version.CompanyId, versionId, streamLength,
            actorUserId, cancellationToken, postCheckRowCount: null);

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;
        var dataRowCount = Math.Max(0, lastRow - 1);

        await EnforceLimitsAsync(
            version.CompanyId, versionId, streamLength,
            actorUserId, cancellationToken, postCheckRowCount: dataRowCount);

        var customers = await LoadActiveCustomersAsync(cancellationToken);

        var errors = new List<ExcelImportRowError>();
        var warnings = new List<string>();
        var valid = 0;

        for (var row = 2; row <= lastRow; row++)
        {
            var outcome = InspectRow(worksheet, row, customers);
            switch (outcome)
            {
                case RowOutcome.Valid:
                    valid++;
                    break;
                case RowOutcome.Empty:
                    // silent skip — blank rows are allowed
                    break;
                case RowOutcome.UnknownCustomer customer:
                    errors.Add(new ExcelImportRowError(row, "unknown_customer", $"Müşteri bulunamadı: '{customer.Name}'"));
                    break;
                case RowOutcome.InvalidAmount amt:
                    errors.Add(new ExcelImportRowError(row, "invalid_amount", $"Ay {amt.Month}: sayı çevrilemedi"));
                    break;
            }
        }

        await _auditLogger.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.BudgetVersion,
            EntityKey: versionId.ToString(),
            Action: AuditActions.ImportPreviewed,
            CompanyId: version.CompanyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new
            {
                totalRows = dataRowCount,
                validRows = valid,
                errorRows = errors.Count,
            })),
            cancellationToken);

        return new ExcelImportPreview(
            TotalRows: dataRowCount,
            ValidRows: valid,
            ErrorRows: errors.Count,
            Errors: errors,
            Warnings: warnings);
    }

    public async Task<ExcelImportResult> CommitAsync(
        int versionId,
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await LoadVersionForImportAsync(versionId, cancellationToken);

        await EnforceLimitsAsync(
            version.CompanyId, versionId, streamLength,
            actorUserId, cancellationToken, postCheckRowCount: null);

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;
        var dataRowCount = Math.Max(0, lastRow - 1);

        await EnforceLimitsAsync(
            version.CompanyId, versionId, streamLength,
            actorUserId, cancellationToken, postCheckRowCount: dataRowCount);

        var customers = await LoadActiveCustomersAsync(cancellationToken);
        var now = _clock.UtcNow;

        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

        if (!await _importGuard.TryAcquireAsync(
                version.CompanyId, ImportLimits.BudgetEntriesResource, cancellationToken))
        {
            await _auditLogger.LogAsync(new AuditEvent(
                EntityName: AuditEntityNames.BudgetVersion,
                EntityKey: versionId.ToString(),
                Action: AuditActions.ImportConcurrencyConflict,
                CompanyId: version.CompanyId,
                UserId: actorUserId),
                cancellationToken);
            throw new ImportConcurrencyConflictException(
                version.CompanyId, ImportLimits.BudgetEntriesResource);
        }

        var warnings = new List<string>();
        var imported = 0;
        var skipped = 0;

        for (var row = 2; row <= lastRow; row++)
        {
            var customerName = worksheet.Cell(row, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(customerName))
            {
                skipped++;
                continue;
            }

            if (!customers.TryGetValue(customerName, out var customer))
            {
                warnings.Add($"Satır {row}: Müşteri bulunamadı — '{customerName}'");
                skipped++;
                continue;
            }

            for (var month = 1; month <= 12; month++)
            {
                var cell = worksheet.Cell(row, month + 2);
                if (cell.IsEmpty()) continue;

                if (!cell.TryGetValue<decimal>(out var amount))
                {
                    warnings.Add($"Satır {row}, Ay {month}: Geçersiz sayı değeri");
                    skipped++;
                    continue;
                }

                _db.BudgetEntries.Add(BudgetEntry.Create(
                    companyId: version.CompanyId,
                    versionId: versionId,
                    customerId: customer.Id,
                    month: month,
                    entryType: EntryType.Revenue,
                    amountOriginal: amount,
                    currencyCode: "TRY",
                    amountTryFixed: amount,
                    amountTrySpot: amount,
                    createdByUserId: actorUserId,
                    createdAt: now));
                imported++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        await _auditLogger.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.BudgetVersion,
            EntityKey: versionId.ToString(),
            Action: AuditActions.ImportCommitted,
            CompanyId: version.CompanyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new { imported, skipped })),
            cancellationToken);

        _logger.LogInformation(
            "Excel import committed: version={VersionId} tenant={Tenant} imported={Imported} skipped={Skipped}",
            versionId, version.CompanyId, imported, skipped);

        return new ExcelImportResult(imported, skipped, warnings);
    }

    private async Task<BudgetVersion> LoadVersionForImportAsync(int versionId, CancellationToken ct)
    {
        var version = await _db.BudgetVersions.FirstOrDefaultAsync(v => v.Id == versionId, ct)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        if (version.Status != BudgetVersionStatus.Draft)
        {
            throw new InvalidOperationException("Sadece taslak durumundaki versiyonlara içe aktarım yapılabilir.");
        }

        return version;
    }

    private async Task<Dictionary<string, Customer>> LoadActiveCustomersAsync(CancellationToken ct) =>
        await _db.Customers
            .Where(c => c.IsActive)
            .ToDictionaryAsync(c => c.Name, c => c, StringComparer.OrdinalIgnoreCase, ct);

    private async Task EnforceLimitsAsync(
        int companyId,
        int versionId,
        long streamLength,
        int actorUserId,
        CancellationToken ct,
        int? postCheckRowCount)
    {
        if (streamLength > ImportLimits.MaxBytes
            || (postCheckRowCount is { } rowCount && rowCount > ImportLimits.MaxRows))
        {
            var rowForAudit = postCheckRowCount ?? 0;
            await _auditLogger.LogAsync(new AuditEvent(
                EntityName: AuditEntityNames.BudgetVersion,
                EntityKey: versionId.ToString(),
                Action: AuditActions.ImportRejectedLimit,
                CompanyId: companyId,
                UserId: actorUserId,
                NewValuesJson: JsonSerializer.Serialize(new
                {
                    bytes = streamLength,
                    rows = rowForAudit,
                    maxBytes = ImportLimits.MaxBytes,
                    maxRows = ImportLimits.MaxRows,
                })),
                ct);

            throw new ImportFileTooLargeException(streamLength, rowForAudit);
        }
    }

    private static RowOutcome InspectRow(IXLWorksheet worksheet, int row, Dictionary<string, Customer> customers)
    {
        var customerName = worksheet.Cell(row, 1).GetString().Trim();
        if (string.IsNullOrWhiteSpace(customerName))
        {
            return RowOutcome.Empty.Instance;
        }

        if (!customers.TryGetValue(customerName, out _))
        {
            return new RowOutcome.UnknownCustomer(customerName);
        }

        for (var month = 1; month <= 12; month++)
        {
            var cell = worksheet.Cell(row, month + 2);
            if (cell.IsEmpty()) continue;
            if (!cell.TryGetValue<decimal>(out _))
            {
                return new RowOutcome.InvalidAmount(month);
            }
        }
        return RowOutcome.Valid.Instance;
    }

    private abstract record RowOutcome
    {
        public sealed record Valid : RowOutcome
        {
            public static readonly Valid Instance = new();
        }

        public sealed record Empty : RowOutcome
        {
            public static readonly Empty Instance = new();
        }

        public sealed record UnknownCustomer(string Name) : RowOutcome;

        public sealed record InvalidAmount(int Month) : RowOutcome;
    }
}
