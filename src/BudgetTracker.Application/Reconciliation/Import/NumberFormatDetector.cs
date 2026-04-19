using System.Globalization;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Hem TR (<c>1.234,56</c>) hem EN (<c>1,234.56</c>) sayı formatını tolerans
/// ile parse eder (spec §6.3). Tespit algoritması: string içinde hem "." hem
/// "," varsa en sağdaki ondalık ayracı olarak kabul edilir; diğeri binlik.
/// Sadece biri varsa: ondalıksa . veya , son 3 karakterden önceyse binlik,
/// sonraysa ondalık.
/// </summary>
public static class NumberFormatDetector
{
    /// <summary>
    /// String'i TR/EN toleransıyla decimal'a çevirir.
    /// Başarısız parse: <see cref="FormatException"/>.
    /// Bos string: <see cref="ArgumentException"/>.
    /// Banker's rounding kullanılmaz (parse sonrası kullanım yeri banker's
    /// rounding uygular; detector saf parse).
    /// </summary>
    public static decimal Parse(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            throw new ArgumentException("empty number", nameof(input));

        var trimmed = input.Trim();

        // Para birimi sembolleri ve negatif parantez (accounting format) —
        // en yaygın varyasyonları destekle.
        var isNegative = false;
        if (trimmed.StartsWith('(') && trimmed.EndsWith(')'))
        {
            isNegative = true;
            trimmed = trimmed[1..^1].Trim();
        }
        if (trimmed.StartsWith('-'))
        {
            isNegative = true;
            trimmed = trimmed[1..].Trim();
        }

        // Para birimi sembol temizliği (₺, TL, EUR, $, €, £ — prefix veya suffix)
        foreach (var sym in new[] { "₺", "TL", "TRY", "USD", "EUR", "$", "€", "£", " " })
        {
            trimmed = trimmed.Replace(sym, string.Empty, StringComparison.OrdinalIgnoreCase);
        }

        if (trimmed.Length == 0)
            throw new FormatException($"no digits after cleaning: '{input}'");

        var canonical = NormalizeToInvariant(trimmed);
        if (!decimal.TryParse(canonical, NumberStyles.Number, CultureInfo.InvariantCulture,
            out var value))
        {
            throw new FormatException($"unable to parse decimal: '{input}' (normalized '{canonical}')");
        }

        return isNegative ? -value : value;
    }

    /// <summary>Deneme — başarısız parse'ta false döner, exception fırlatmaz.</summary>
    public static bool TryParse(string input, out decimal value)
    {
        try
        {
            value = Parse(input);
            return true;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException)
        {
            value = 0m;
            return false;
        }
    }

    private static string NormalizeToInvariant(string trimmed)
    {
        var hasDot = trimmed.Contains('.');
        var hasComma = trimmed.Contains(',');

        if (hasDot && hasComma)
        {
            // Son görünen ondalık ayracıdır. Diğeri binlik separator olarak silinir.
            var lastDot = trimmed.LastIndexOf('.');
            var lastComma = trimmed.LastIndexOf(',');
            if (lastComma > lastDot)
            {
                // TR formatı: 1.234,56 → 1234.56
                return trimmed.Replace(".", string.Empty, StringComparison.Ordinal)
                    .Replace(',', '.');
            }
            // EN formatı: 1,234.56 → 1234.56
            return trimmed.Replace(",", string.Empty, StringComparison.Ordinal);
        }

        if (hasComma)
        {
            // Tek ayraç virgül. Son grup 1-2 haneliyse ondalık, 3 haneliyse binlik.
            var lastComma = trimmed.LastIndexOf(',');
            var afterComma = trimmed.Length - lastComma - 1;
            if (afterComma == 3 && trimmed[..lastComma].All(c => char.IsDigit(c) || c == ','))
            {
                // 1,234 formatı binlik gibi. Ama tek virgülle 3 hane her zaman
                // binlik değil (ör. "123,456" = 123456 mı, 123.456 mı? EN binlik
                // favorisi varsayıyoruz.)
                return trimmed.Replace(",", string.Empty, StringComparison.Ordinal);
            }
            // TR ondalık: 1234,56 → 1234.56
            return trimmed.Replace(',', '.');
        }

        if (hasDot)
        {
            // Tek ayraç nokta — benzer mantık. "1.234" binlik mi ondalık mı?
            // En yaygın finans varsayımı: ondalık hane 1-2 ise ondalık, 3 ise binlik.
            var lastDot = trimmed.LastIndexOf('.');
            var afterDot = trimmed.Length - lastDot - 1;
            if (afterDot == 3 && trimmed.Count(c => c == '.') == 1
                && trimmed[..lastDot].All(char.IsDigit))
            {
                // "1.234" → TR binlik konvansiyonu (1234). Ancak çift ondalıklı
                // sayılarla karışır; uyarı: template validator bunu "warning"
                // olarak işaretlemeli. Detector default: binlik sil.
                return trimmed.Replace(".", string.Empty, StringComparison.Ordinal);
            }
            // Standart EN ondalık: 1234.56 veya 12.5
            return trimmed;
        }

        // Saf rakam dizisi
        return trimmed;
    }
}
