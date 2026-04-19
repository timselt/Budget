using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Infrastructure.Reconciliation.Import;

/// <summary>
/// <see cref="IReconciliationImportParser"/> default implementasyonu.
/// Dosya extension'a göre xlsx/csv reader seçer; ColumnMappingResolver
/// ile header normalize eder; TemplateRowValidator ile her satırı validate.
/// </summary>
public sealed class ReconciliationImportParser : IReconciliationImportParser
{
    private const int MaxRowsPerBatch = 20_000;

    private readonly XlsxStreamReader _xlsxReader;
    private readonly CsvStreamReader _csvReader;

    public ReconciliationImportParser(
        XlsxStreamReader xlsxReader,
        CsvStreamReader csvReader)
    {
        _xlsxReader = xlsxReader;
        _csvReader = csvReader;
    }

    public async Task<ParsedBatchResult> ParseAsync(
        Stream fileStream,
        string fileName,
        ReconciliationFlow flow,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(fileStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);

        var sha256 = await FileHashCalculator.ComputeSha256HexAsync(fileStream, cancellationToken)
            .ConfigureAwait(false);

        var reader = SelectReader(fileName);
        var raw = await reader.ReadAsync(fileStream, MaxRowsPerBatch, cancellationToken)
            .ConfigureAwait(false);

        if (raw.Headers.Count == 0)
        {
            return new ParsedBatchResult(
                SourceFileHash: sha256,
                TotalRows: 0, OkRows: 0, WarningRows: 0, ErrorRows: 0,
                Truncated: raw.Truncated,
                Rows: Array.Empty<TemplateRowValidationResult>());
        }

        var template = ReconciliationTemplates.ForFlow(flow);
        var resolver = new ColumnMappingResolver(template.AsAliasMap());
        var headerToCanonical = resolver.ResolveAll(raw.Headers);
        // Header listesindeki bilinmeyenler sessizce yok sayılır;
        // notlar/free-form sütunlar buna girer. Eksik canonical zorunlu
        // kolon validator tarafından satır seviyesinde "REQUIRED_MISSING"
        // ile yakalanır.

        var validator = new TemplateRowValidator(template);

        var validated = new List<TemplateRowValidationResult>(raw.Rows.Count);
        foreach (var rawRow in raw.Rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Header → canonical mapping uygula. Eşleşmeyen kolonlar
            // canonical map'e girmez; validator REQUIRED_MISSING üretir.
            var canonicalRow = new Dictionary<string, string?>(StringComparer.Ordinal);
            foreach (var (canonicalName, headerIndex) in headerToCanonical)
            {
                if (headerIndex < raw.Headers.Count)
                {
                    var headerName = raw.Headers[headerIndex];
                    rawRow.TryGetValue(headerName, out var value);
                    canonicalRow[canonicalName] = value;
                }
            }

            validated.Add(validator.Validate(canonicalRow));
        }

        return new ParsedBatchResult(
            SourceFileHash: sha256,
            TotalRows: validated.Count,
            OkRows: validated.Count(r => r.Status == ReconciliationParseStatus.Ok),
            WarningRows: validated.Count(r => r.Status == ReconciliationParseStatus.Warning),
            ErrorRows: validated.Count(r => r.Status == ReconciliationParseStatus.Error),
            Truncated: raw.Truncated,
            Rows: validated);
    }

    private IImportStreamReader SelectReader(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".xlsx" => _xlsxReader,
            ".csv" => _csvReader,
            _ => throw new ImportReadException(
                $"unsupported file extension '{ext}'; expected .xlsx or .csv"),
        };
    }
}
