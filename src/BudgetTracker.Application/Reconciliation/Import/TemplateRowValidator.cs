using System.Text.Json;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Bir template tanımına göre tek satırı validate eder. Template-agnostic
/// (sigorta + otomotiv ortak) — kolon tip parsing + zorunluluk kontrolü.
/// Çıktı:
/// <list type="bullet">
///   <item>Ok: tüm zorunlu doldurulmuş, tipler parse edilmiş</item>
///   <item>Warning: opsiyonel alan parse edilemedi (örn. kötü formatlı
///         beklenen fiyat) — satır kabul edilir, error listesi taşınır</item>
///   <item>Error: zorunlu alan eksik veya tipi parse edilemedi —
///         satır SourceRow.Error olarak kaydedilir, batch reddedilmez</item>
/// </list>
/// </summary>
public sealed class TemplateRowValidator
{
    private readonly TemplateDefinition _template;

    public TemplateRowValidator(TemplateDefinition template)
    {
        ArgumentNullException.ThrowIfNull(template);
        _template = template;
    }

    /// <summary>
    /// Tek satırı validate eder.
    /// <paramref name="rawRow"/> canonical kolon → ham string değer
    /// (resolver tarafından önceden normalize edilmiş).
    /// </summary>
    public TemplateRowValidationResult Validate(
        IReadOnlyDictionary<string, string?> rawRow)
    {
        ArgumentNullException.ThrowIfNull(rawRow);

        var errors = new List<ParseErrorEntry>();
        var warnings = new List<ParseErrorEntry>();
        var canonical = new Dictionary<string, object?>(StringComparer.Ordinal);

        foreach (var col in _template.Columns)
        {
            rawRow.TryGetValue(col.CanonicalName, out var raw);
            var trimmed = string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();

            if (trimmed is null)
            {
                if (col.IsRequired)
                {
                    errors.Add(new ParseErrorEntry(col.CanonicalName,
                        "REQUIRED_MISSING",
                        $"required column '{col.CanonicalName}' is empty"));
                }
                canonical[col.CanonicalName] = null;
                continue;
            }

            try
            {
                canonical[col.CanonicalName] = ParseValue(trimmed, col.ValueType, col.CanonicalName);
            }
            catch (FormatException fe)
            {
                var entry = new ParseErrorEntry(col.CanonicalName, "TYPE_PARSE_ERROR", fe.Message);
                if (col.IsRequired) errors.Add(entry);
                else warnings.Add(entry);
                canonical[col.CanonicalName] = null;
            }
        }

        var status = errors.Count > 0
            ? ReconciliationParseStatus.Error
            : warnings.Count > 0 ? ReconciliationParseStatus.Warning : ReconciliationParseStatus.Ok;

        var allIssues = errors.Concat(warnings).ToList();
        var errorJson = allIssues.Count > 0 ? SerializeIssues(allIssues) : null;
        var rawJson = SerializeRow(canonical);

        return new TemplateRowValidationResult(
            Status: status,
            CanonicalRow: canonical,
            RawPayloadJson: rawJson,
            ParseErrorsJson: errorJson,
            ExternalCustomerRef: canonical.TryGetValue("external_customer_ref", out var cr)
                ? cr as string ?? string.Empty
                : string.Empty,
            ExternalDocumentRef: ResolveDocumentRef(canonical));
    }

    private static object ParseValue(string raw, ColumnValueType type, string columnName) => type switch
    {
        ColumnValueType.String => raw,
        ColumnValueType.Integer => int.TryParse(raw, out var i)
            ? i
            : throw new FormatException(
                $"column '{columnName}': not an integer: '{raw}'"),
        ColumnValueType.Decimal => NumberFormatDetector.Parse(raw),
        ColumnValueType.Date => DateFormatDetector.ParseDate(raw),
        ColumnValueType.PeriodCode => DateFormatDetector.IsValidPeriodCode(raw)
            ? raw
            : throw new FormatException(
                $"column '{columnName}': invalid period_code (expected YYYY-MM): '{raw}'"),
        _ => throw new InvalidOperationException($"unknown ValueType: {type}"),
    };

    /// <summary>
    /// Sigorta: policy_no, otomotiv: case_ref. Hangi alanın "doküman ref"
    /// olduğu template'e göre değişir; iki adı da arar.
    /// </summary>
    private static string? ResolveDocumentRef(IReadOnlyDictionary<string, object?> canonical)
    {
        if (canonical.TryGetValue("policy_no", out var p) && p is string ps && !string.IsNullOrEmpty(ps))
            return ps;
        if (canonical.TryGetValue("case_ref", out var c) && c is string cs && !string.IsNullOrEmpty(cs))
            return cs;
        return null;
    }

    private static string SerializeRow(IReadOnlyDictionary<string, object?> row)
    {
        var serializable = row.ToDictionary(
            kv => kv.Key,
            kv => kv.Value switch
            {
                DateOnly d => (object?)d.ToString("yyyy-MM-dd"),
                _ => kv.Value,
            });
        return JsonSerializer.Serialize(serializable);
    }

    private static string SerializeIssues(IReadOnlyList<ParseErrorEntry> issues)
        => JsonSerializer.Serialize(issues);
}

/// <summary>Tek satır validate sonucu — pipeline'ın SourceRow yazımı için.</summary>
public sealed record TemplateRowValidationResult(
    ReconciliationParseStatus Status,
    IReadOnlyDictionary<string, object?> CanonicalRow,
    string RawPayloadJson,
    string? ParseErrorsJson,
    string ExternalCustomerRef,
    string? ExternalDocumentRef);

/// <summary>Tek bir parse hatası kaydı (jsonb içinde liste halinde tutulur).</summary>
public sealed record ParseErrorEntry(
    string Field,
    string Code,
    string Message);
