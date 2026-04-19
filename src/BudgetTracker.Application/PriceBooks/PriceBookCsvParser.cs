using System.Globalization;

namespace BudgetTracker.Application.PriceBooks;

/// <summary>
/// PriceBook item bulk CSV parser (00b §6). RFC 4180 temel diyalektini
/// destekler: virgül ayraç, noktalı-virgül ayraç (Türk locale Excel),
/// çift tırnak quoting, escaped quotes (<c>""</c>).
/// <para>
/// Zorunlu kolonlar: <c>product_code, product_name, item_type, unit, unit_price</c>.
/// Opsiyonel: <c>currency_code, tax_rate, min_quantity, notes</c>.
/// </para>
/// Üretim ölçeği sınırı: tek dosya &lt;10 000 satır. Daha büyük veri bulk JSON
/// endpoint'iyle batch'lenmelidir.
/// </summary>
public static class PriceBookCsvParser
{
    private const int MaxRows = 10_000;

    public static IReadOnlyList<PriceBookItemInput> Parse(TextReader reader)
    {
        ArgumentNullException.ThrowIfNull(reader);
        var rows = ReadRows(reader).ToList();
        if (rows.Count == 0)
        {
            throw new InvalidOperationException("CSV is empty");
        }
        if (rows.Count > MaxRows + 1)
        {
            throw new InvalidOperationException(
                $"CSV exceeds {MaxRows} data rows; split into batches.");
        }
        var header = rows[0];
        var map = BuildHeaderMap(header);
        var result = new List<PriceBookItemInput>(rows.Count - 1);
        for (var i = 1; i < rows.Count; i++)
        {
            var cells = rows[i];
            if (cells.All(string.IsNullOrWhiteSpace)) continue;
            result.Add(new PriceBookItemInput(
                ProductCode: Require(cells, map, "product_code", i),
                ProductName: Require(cells, map, "product_name", i),
                ItemType: Require(cells, map, "item_type", i),
                Unit: Require(cells, map, "unit", i),
                UnitPrice: ParseDecimal(Require(cells, map, "unit_price", i), "unit_price", i),
                CurrencyCode: Optional(cells, map, "currency_code"),
                TaxRate: ParseNullableDecimal(Optional(cells, map, "tax_rate"), "tax_rate", i),
                MinQuantity: ParseNullableDecimal(Optional(cells, map, "min_quantity"), "min_quantity", i),
                Notes: Optional(cells, map, "notes")));
        }
        return result;
    }

    private static IEnumerable<string[]> ReadRows(TextReader reader)
    {
        string? first = reader.ReadLine();
        if (first is null) yield break;
        var delimiter = DetectDelimiter(first);
        yield return SplitCsvLine(first, delimiter);

        string? line;
        while ((line = reader.ReadLine()) is not null)
        {
            yield return SplitCsvLine(line, delimiter);
        }
    }

    private static char DetectDelimiter(string firstLine)
    {
        // Türk locale Excel noktalı-virgül kullanır; bazı export'lar sekme.
        var commas = firstLine.Count(c => c == ',');
        var semis = firstLine.Count(c => c == ';');
        if (semis > commas) return ';';
        return ',';
    }

    private static string[] SplitCsvLine(string line, char delimiter)
    {
        var cells = new List<string>();
        var buf = new System.Text.StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (inQuotes)
            {
                if (ch == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        buf.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    buf.Append(ch);
                }
            }
            else
            {
                if (ch == '"') { inQuotes = true; }
                else if (ch == delimiter) { cells.Add(buf.ToString()); buf.Clear(); }
                else { buf.Append(ch); }
            }
        }
        cells.Add(buf.ToString());
        return cells.Select(c => c.Trim()).ToArray();
    }

    private static Dictionary<string, int> BuildHeaderMap(string[] header)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < header.Length; i++)
        {
            var key = Normalize(header[i]);
            if (!string.IsNullOrEmpty(key))
            {
                map[key] = i;
            }
        }
        foreach (var required in new[] { "product_code", "product_name", "item_type", "unit", "unit_price" })
        {
            if (!map.ContainsKey(required))
            {
                throw new InvalidOperationException($"CSV missing required column '{required}'");
            }
        }
        return map;
    }

    private static string Normalize(string header) =>
        header.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_');

    private static string Require(string[] cells, Dictionary<string, int> map, string key, int row)
    {
        var value = Optional(cells, map, key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"CSV row {row}: '{key}' is required");
        }
        return value;
    }

    private static string Optional(string[] cells, Dictionary<string, int> map, string key)
    {
        if (!map.TryGetValue(key, out var idx)) return string.Empty;
        if (idx >= cells.Length) return string.Empty;
        return cells[idx];
    }

    private static decimal ParseDecimal(string value, string field, int row)
    {
        // Hem "1.234,56" (TR) hem "1234.56" (EN) kabul et:
        //  - İkisi birden varsa: son karakteri ondalık ayraç kabul et, diğeri binlik.
        //  - Tek başına "," varsa: onu ondalık say → "," → ".".
        //  - Sadece "." varsa: aynen InvariantCulture ile parse et.
        string normalized;
        var hasComma = value.Contains(',');
        var hasDot = value.Contains('.');
        if (hasComma && hasDot)
        {
            var lastComma = value.LastIndexOf(',');
            var lastDot = value.LastIndexOf('.');
            if (lastComma > lastDot)
            {
                // TR formatı: "1.234,56" → "1234.56"
                normalized = value.Replace(".", string.Empty).Replace(',', '.');
            }
            else
            {
                // EN formatı: "1,234.56" → "1234.56"
                normalized = value.Replace(",", string.Empty);
            }
        }
        else if (hasComma)
        {
            normalized = value.Replace(',', '.');
        }
        else
        {
            normalized = value;
        }

        if (!decimal.TryParse(normalized, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
        {
            throw new InvalidOperationException($"CSV row {row}: '{field}' invalid decimal '{value}'");
        }
        return d;
    }

    private static decimal? ParseNullableDecimal(string value, string field, int row)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return ParseDecimal(value, field, row);
    }
}
