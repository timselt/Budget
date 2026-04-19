using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Reports;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BudgetTracker.Infrastructure.Reports;

public sealed class PdfReportService : IPdfReportService
{
    static PdfReportService() => QuestPdfFontBootstrap.Register();

    private const string FontFamily = "Lato";

    private static readonly string[] MonthNames =
    [
        "Oca", "Şub", "Mar", "Nis", "May", "Haz",
        "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"
    ];

    private readonly IApplicationDbContext _db;

    public PdfReportService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<byte[]> GenerateManagementReportAsync(int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"BudgetVersion {versionId} bulunamadı.");

        var entries = await _db.BudgetEntries
            .Where(e => e.VersionId == versionId)
            .ToListAsync(cancellationToken);

        var customerIds = entries.Select(e => e.CustomerId).Distinct().ToList();

        var customers = await _db.Customers
            .Where(c => customerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken);

        var monthlyTotals = entries
            .GroupBy(e => e.Month)
            .OrderBy(g => g.Key)
            .Select(g => new { Month = g.Key, Total = g.Sum(e => e.AmountTryFixed) })
            .ToList();

        var customerTotals = entries
            .GroupBy(e => e.CustomerId)
            .Select(g => new
            {
                CustomerName = customers.TryGetValue(g.Key, out var name) ? name : $"#{g.Key}",
                Total = g.Sum(e => e.AmountTryFixed)
            })
            .OrderByDescending(c => c.Total)
            .Take(20)
            .ToList();

        var grandTotal = entries.Sum(e => e.AmountTryFixed);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.MarginHorizontal(30);
                page.MarginVertical(25);
                page.DefaultTextStyle(x => x.FontFamily(FontFamily));

                page.Header().Column(col =>
                {
                    col.Item().Text("Yönetim Bütçe Raporu")
                        .FontSize(18).Bold().FontColor(Colors.Blue.Darken3);
                    col.Item().Text($"Versiyon: {version.Name} | Durum: {version.Status}")
                        .FontSize(10).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().Column(col =>
                {
                    col.Item().Text("Aylık Toplam (TRY Sabit Kur)")
                        .FontSize(13).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingBottom(5);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(3);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Blue.Darken3).Padding(5)
                                .Text("Ay").FontColor(Colors.White).Bold().FontSize(9);
                            header.Cell().Background(Colors.Blue.Darken3).Padding(5)
                                .Text("Tutar (TRY)").FontColor(Colors.White).Bold().FontSize(9)
                                .AlignRight();
                        });

                        foreach (var mt in monthlyTotals)
                        {
                            var monthLabel = mt.Month >= 1 && mt.Month <= 12
                                ? MonthNames[mt.Month - 1]
                                : mt.Month.ToString();

                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Padding(4).Text(monthLabel).FontSize(9);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Padding(4).Text(mt.Total.ToString("N0")).FontSize(9)
                                .AlignRight();
                        }

                        table.Cell().Background(Colors.Grey.Lighten3).Padding(4)
                            .Text("Toplam").Bold().FontSize(9);
                        table.Cell().Background(Colors.Grey.Lighten3).Padding(4)
                            .Text(grandTotal.ToString("N0")).Bold().FontSize(9)
                            .AlignRight();
                    });

                    col.Item().PaddingTop(15);
                    col.Item().Text("En Yüksek 20 Müşteri (TRY Sabit Kur)")
                        .FontSize(13).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingBottom(5);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(3);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Blue.Darken3).Padding(5)
                                .Text("Müşteri").FontColor(Colors.White).Bold().FontSize(9);
                            header.Cell().Background(Colors.Blue.Darken3).Padding(5)
                                .Text("Tutar (TRY)").FontColor(Colors.White).Bold().FontSize(9)
                                .AlignRight();
                        });

                        foreach (var ct in customerTotals)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Padding(4).Text(ct.CustomerName).FontSize(9);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Padding(4).Text(ct.Total.ToString("N0")).FontSize(9)
                                .AlignRight();
                        }
                    });
                });

                // Footer: left cell carries the KVKK notice (required on every
                // exported report — ADR-0008 §2.2), right cell handles pagination.
                page.Footer().Row(row =>
                {
                    row.RelativeItem().Text(t =>
                    {
                        t.Span("KVKK Madde 11 uyarınca kişisel veri içerir — yetkisiz paylaşım yasaktır.")
                            .FontSize(7).FontColor(Colors.Grey.Darken1);
                    });
                    row.ConstantItem(80).AlignRight().Text(t =>
                    {
                        t.Span("Sayfa ").FontSize(8);
                        t.CurrentPageNumber().FontSize(8);
                        t.Span(" / ").FontSize(8);
                        t.TotalPages().FontSize(8);
                    });
                });
            });
        });

        return document.GeneratePdf();
    }
}
