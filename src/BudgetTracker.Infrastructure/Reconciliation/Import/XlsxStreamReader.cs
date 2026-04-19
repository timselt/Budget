using System.Globalization;
using BudgetTracker.Application.Reconciliation.Import;
using ClosedXML.Excel;

namespace BudgetTracker.Infrastructure.Reconciliation.Import;

/// <summary>
/// .xlsx dosyalarını ClosedXML ile okur. İlk worksheet kullanılır
/// (mutabakat dosyaları tek sayfa konvansiyonu — multi-sheet uyarısı
/// Sprint 2'de eklenir). Başlık ilk satırdadır; spec §6.3 "ilk 2 satıra
/// kadar tolerans" — boş ilk satır atlanır, başlık 2. satırdan başlayabilir.
/// </summary>
public sealed class XlsxStreamReader : IImportStreamReader
{
    public Task<ImportReadResult> ReadAsync(
        Stream stream,
        int maxRows,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(stream);
        if (maxRows <= 0) throw new ArgumentOutOfRangeException(nameof(maxRows));

        try
        {
            using var workbook = new XLWorkbook(stream);
            var sheet = workbook.Worksheets.FirstOrDefault()
                ?? throw new ImportReadException("xlsx workbook has no worksheets");

            return Task.FromResult(ReadSheet(sheet, maxRows, cancellationToken));
        }
        catch (ImportReadException) { throw; }
        catch (Exception ex)
        {
            throw new ImportReadException(
                "failed to read xlsx file (corrupt or unsupported format)", ex);
        }
    }

    private static ImportReadResult ReadSheet(
        IXLWorksheet sheet,
        int maxRows,
        CancellationToken cancellationToken)
    {
        var usedRange = sheet.RangeUsed();
        if (usedRange is null)
        {
            return new ImportReadResult(Array.Empty<string>(),
                Array.Empty<IReadOnlyDictionary<string, string?>>(), Truncated: false);
        }

        var allRows = usedRange.RowsUsed().ToList();
        if (allRows.Count == 0)
        {
            return new ImportReadResult(Array.Empty<string>(),
                Array.Empty<IReadOnlyDictionary<string, string?>>(), Truncated: false);
        }

        // Başlık satırı: ilk dolu satır (spec §6.3 — boş ilk satır tolere)
        var headerRow = allRows[0];
        var headers = headerRow.CellsUsed()
            .Select(c => c.GetString().Trim())
            .Where(h => !string.IsNullOrEmpty(h))
            .ToList();

        if (headers.Count == 0)
        {
            throw new ImportReadException("xlsx header row is empty");
        }

        var headerColumnIndices = headerRow.CellsUsed()
            .Where(c => !string.IsNullOrWhiteSpace(c.GetString()))
            .Select(c => c.Address.ColumnNumber)
            .ToList();

        var dataRows = new List<IReadOnlyDictionary<string, string?>>();
        var truncated = false;
        var seenRows = 0;

        foreach (var row in allRows.Skip(1))
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (seenRows >= maxRows)
            {
                truncated = true;
                break;
            }

            var dict = new Dictionary<string, string?>(StringComparer.Ordinal);
            var hasContent = false;

            for (var i = 0; i < headers.Count; i++)
            {
                var col = headerColumnIndices[i];
                var cell = row.Cell(col);
                var value = ConvertCellToString(cell);
                dict[headers[i]] = value;
                if (!string.IsNullOrWhiteSpace(value)) hasContent = true;
            }

            if (!hasContent) continue; // boş satır atla
            dataRows.Add(dict);
            seenRows++;
        }

        return new ImportReadResult(headers, dataRows, truncated);
    }

    /// <summary>
    /// Cell tipi → string. DateTime → ISO-8601 (yyyy-MM-dd), sayı → invariant
    /// culture (binlik/ondalık yok), bool → "true"/"false". Detector pipeline
    /// CSV ile aynı string formatı bekler.
    /// </summary>
    private static string? ConvertCellToString(IXLCell cell)
    {
        if (cell is null || cell.IsEmpty()) return null;

        return cell.DataType switch
        {
            XLDataType.DateTime => cell.GetDateTime().ToString(
                cell.GetDateTime().TimeOfDay == TimeSpan.Zero ? "yyyy-MM-dd" : "yyyy-MM-ddTHH:mm:ss",
                CultureInfo.InvariantCulture),
            XLDataType.Number => cell.GetDouble().ToString("R", CultureInfo.InvariantCulture),
            XLDataType.Boolean => cell.GetBoolean() ? "true" : "false",
            _ => cell.GetString().Trim(),
        };
    }
}
