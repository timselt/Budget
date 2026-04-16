using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reports;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Reports;

public sealed class ExcelExportService : IExcelExportService
{
    private static readonly string[] MonthHeaders =
    [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    private readonly IApplicationDbContext _db;

    public ExcelExportService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<byte[]> ExportBudgetEntriesAsync(int versionId, CancellationToken cancellationToken)
    {
        var entries = await _db.BudgetEntries
            .Where(e => e.VersionId == versionId)
            .OrderBy(e => e.CustomerId)
            .ThenBy(e => e.Month)
            .ToListAsync(cancellationToken);

        var customerIds = entries.Select(e => e.CustomerId).Distinct().ToList();

        var customers = await _db.Customers
            .Where(c => customerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => new { c.Name, c.SegmentId }, cancellationToken);

        var segmentIds = customers.Values.Select(c => c.SegmentId).Distinct().ToList();

        var segments = await _db.Segments
            .Where(s => segmentIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name, cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Bütçe Kalemleri");

        WriteHeaders(worksheet);

        var grouped = entries
            .GroupBy(e => e.CustomerId)
            .OrderBy(g => g.Key);

        var row = 2;
        foreach (var group in grouped)
        {
            var customerName = customers.TryGetValue(group.Key, out var cust) ? cust.Name : $"#{group.Key}";
            var segmentName = cust is not null && segments.TryGetValue(cust.SegmentId, out var sName)
                ? sName
                : "-";

            worksheet.Cell(row, 1).Value = customerName;
            worksheet.Cell(row, 2).Value = segmentName;

            decimal total = 0;
            foreach (var entry in group)
            {
                var col = entry.Month + 2; // col 3..14
                worksheet.Cell(row, col).Value = entry.AmountOriginal;
                total += entry.AmountOriginal;
            }

            worksheet.Cell(row, 15).Value = total;
            row++;
        }

        FormatWorksheet(worksheet, row - 1);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void WriteHeaders(IXLWorksheet ws)
    {
        ws.Cell(1, 1).Value = "Müşteri";
        ws.Cell(1, 2).Value = "Segment";

        for (var i = 0; i < MonthHeaders.Length; i++)
        {
            ws.Cell(1, i + 3).Value = MonthHeaders[i];
        }

        ws.Cell(1, 15).Value = "Toplam";
    }

    private static void FormatWorksheet(IXLWorksheet ws, int lastDataRow)
    {
        var headerRange = ws.Range(1, 1, 1, 15);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(0x1F, 0x4E, 0x79);
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        if (lastDataRow >= 2)
        {
            var dataRange = ws.Range(2, 3, lastDataRow, 15);
            dataRange.Style.NumberFormat.Format = "#,##0.00";
        }

        ws.Columns().AdjustToContents();
    }
}
