using BudgetTracker.Application.Collections;
using BudgetTracker.Application.Collections.Dtos;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CollectionImportService : ICollectionImportService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly ILogger<CollectionImportService> _logger;

    public CollectionImportService(
        IApplicationDbContext db,
        IClock clock,
        ILogger<CollectionImportService> logger)
    {
        _db = db;
        _clock = clock;
        _logger = logger;
    }

    public async Task<ImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        int segmentId,
        int companyId,
        int actorUserId,
        CancellationToken ct = default)
    {
        var now = _clock.UtcNow;
        var period = ImportPeriod.Create(
            companyId, segmentId, now.UtcDateTime, fileName, actorUserId, now);

        _db.ImportPeriods.Add(period);
        await _db.SaveChangesAsync(ct);

        var warnings = new List<string>();
        var customersProcessed = 0;
        var invoicesProcessed = 0;
        var totalAmount = 0m;

        try
        {
            using var workbook = new XLWorkbook(fileStream);
            var worksheet = FindTargetWorksheet(workbook);

            if (worksheet is null)
            {
                warnings.Add("Hedef calisma sayfasi bulunamadi ('Tumu' veya 'Toplam'). Ilk sayfa kullaniliyor.");
                worksheet = workbook.Worksheets.First();
            }

            var today = now.UtcDateTime.Date;
            Customer? currentCustomer = null;
            var lastUsedRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;

            for (var row = 1; row <= lastUsedRow; row++)
            {
                var cellA = worksheet.Cell(row, 1).GetString().Trim();

                if (string.IsNullOrWhiteSpace(cellA))
                {
                    continue;
                }

                if (IsCustomerHeaderRow(cellA))
                {
                    var (accountNo, fullTitle) = ParseCustomerHeader(cellA);
                    currentCustomer = await FindOrCreateCustomerAsync(
                        companyId, segmentId, accountNo, fullTitle, actorUserId, now, ct);
                    customersProcessed++;
                    continue;
                }

                if (currentCustomer is null)
                {
                    continue;
                }

                var invoiceResult = TryParseInvoiceRow(worksheet, row, today);
                if (invoiceResult is null)
                {
                    continue;
                }

                var (invoiceNo, transactionDate, dueDate, daysDiff, amount, note, status) = invoiceResult.Value;

                var invoice = CollectionInvoice.Create(
                    companyId,
                    period.Id,
                    currentCustomer.Id,
                    invoiceNo,
                    transactionDate,
                    dueDate,
                    daysDiff,
                    amount,
                    status,
                    actorUserId,
                    now,
                    note);

                period.AddInvoice(invoice);
                _db.CollectionInvoices.Add(invoice);
                totalAmount += amount;
                invoicesProcessed++;
            }

            var overdueAmount = period.Invoices
                .Where(i => i.Status == InvoiceCollectionStatus.Overdue)
                .Sum(i => i.Amount);
            var pendingAmount = period.Invoices
                .Where(i => i.Status == InvoiceCollectionStatus.Pending)
                .Sum(i => i.Amount);

            period.MarkCompleted(totalAmount, overdueAmount, pendingAmount, now, actorUserId);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Collection import completed for period {PeriodId}: {Customers} customers, {Invoices} invoices, {Total:N2} total",
                period.Id, customersProcessed, invoicesProcessed, totalAmount);

            return new ImportResultDto(
                period.Id, customersProcessed, invoicesProcessed,
                totalAmount, warnings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Collection import failed for period {PeriodId}, file {FileName}",
                period.Id, fileName);

            period.MarkFailed(now, actorUserId);
            await _db.SaveChangesAsync(ct);

            throw;
        }
    }

    private static IXLWorksheet? FindTargetWorksheet(XLWorkbook workbook)
    {
        var targetNames = new[] { "Tümü", "Tumu", "Toplam" };

        foreach (var name in targetNames)
        {
            if (workbook.TryGetWorksheet(name, out var ws))
            {
                return ws;
            }
        }

        return null;
    }

    private static bool IsCustomerHeaderRow(string cellA)
    {
        return cellA.StartsWith("1500", StringComparison.Ordinal) && cellA.Contains('/');
    }

    private static (string AccountNo, string FullTitle) ParseCustomerHeader(string cellA)
    {
        var accountNo = cellA.Length >= 10
            ? cellA[..10].Trim()
            : cellA.Split('/')[0].Trim();

        var slashIndex = cellA.IndexOf('/');
        var fullTitle = slashIndex >= 0 && slashIndex < cellA.Length - 1
            ? cellA[(slashIndex + 1)..].Trim()
            : cellA;

        return (accountNo, fullTitle);
    }

    private async Task<Customer> FindOrCreateCustomerAsync(
        int companyId,
        int segmentId,
        string accountNo,
        string fullTitle,
        int actorUserId,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var existing = await _db.Customers
            .FirstOrDefaultAsync(c => c.AccountNo == accountNo && c.CompanyId == companyId, ct);

        if (existing is not null)
        {
            return existing;
        }

        var code = accountNo.Length > 30 ? accountNo[..30] : accountNo;
        var name = fullTitle.Length > 200 ? fullTitle[..200] : fullTitle;

        var customer = Customer.Create(
            companyId, code, name, segmentId, actorUserId, now);

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        return customer;
    }

    private static (string InvoiceNo, DateTime TransactionDate, DateTime DueDate, int DaysDiff, decimal Amount, string? Note, InvoiceCollectionStatus Status)?
        TryParseInvoiceRow(IXLWorksheet ws, int row, DateTime today)
    {
        try
        {
            var invoiceNo = ws.Cell(row, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(invoiceNo))
            {
                return null;
            }

            var transactionDate = ParseDateCell(ws.Cell(row, 2));
            var dueDate = ParseDateCell(ws.Cell(row, 3));

            if (transactionDate == default || dueDate == default)
            {
                return null;
            }

            var daysDiffCell = ws.Cell(row, 4);
            var daysDiff = daysDiffCell.IsEmpty()
                ? (int)Math.Round((today - dueDate).TotalDays, MidpointRounding.ToEven)
                : (int)Math.Round(daysDiffCell.GetDouble(), MidpointRounding.ToEven);

            var amountCell = ws.Cell(row, 5);
            if (amountCell.IsEmpty())
            {
                return null;
            }

            var amount = (decimal)amountCell.GetDouble();
            var note = ws.Cell(row, 6).IsEmpty() ? null : ws.Cell(row, 6).GetString().Trim();
            var status = dueDate < today
                ? InvoiceCollectionStatus.Overdue
                : InvoiceCollectionStatus.Pending;

            return (invoiceNo, transactionDate, dueDate, daysDiff, amount, note, status);
        }
        catch
        {
            return null;
        }
    }

    private static DateTime ParseDateCell(IXLCell cell)
    {
        if (cell.IsEmpty())
        {
            return default;
        }

        if (cell.DataType == XLDataType.DateTime)
        {
            return cell.GetDateTime();
        }

        return DateTime.TryParse(cell.GetString(), out var parsed) ? parsed : default;
    }
}
