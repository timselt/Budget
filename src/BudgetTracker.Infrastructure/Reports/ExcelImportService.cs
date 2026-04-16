using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reports;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Reports;

public sealed class ExcelImportService : IExcelImportService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public ExcelImportService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<ExcelImportResult> ImportBudgetEntriesAsync(
        int versionId,
        Stream excelStream,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        if (version.Status != BudgetVersionStatus.Draft)
        {
            throw new InvalidOperationException("Sadece taslak durumundaki versiyonlara içe aktarım yapılabilir.");
        }

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();

        var customers = await _db.Customers
            .Where(c => c.IsActive)
            .ToDictionaryAsync(c => c.Name, c => c, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var warnings = new List<string>();
        var importedCount = 0;
        var skippedCount = 0;
        var now = _clock.UtcNow;

        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (var row = 2; row <= lastRow; row++)
        {
            var customerName = worksheet.Cell(row, 1).GetString().Trim();

            if (string.IsNullOrWhiteSpace(customerName))
            {
                skippedCount++;
                continue;
            }

            if (!customers.TryGetValue(customerName, out var customer))
            {
                warnings.Add($"Satır {row}: Müşteri bulunamadı — '{customerName}'");
                skippedCount++;
                continue;
            }

            for (var month = 1; month <= 12; month++)
            {
                var cell = worksheet.Cell(row, month + 2);
                if (cell.IsEmpty())
                {
                    continue;
                }

                if (!cell.TryGetValue<decimal>(out var amount))
                {
                    warnings.Add($"Satır {row}, Ay {month}: Geçersiz sayı değeri");
                    skippedCount++;
                    continue;
                }

                var entry = BudgetEntry.Create(
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
                    createdAt: now);

                _db.BudgetEntries.Add(entry);
                importedCount++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new ExcelImportResult(importedCount, skippedCount, warnings);
    }
}
