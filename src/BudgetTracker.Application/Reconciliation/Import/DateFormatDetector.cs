using System.Globalization;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Tarih string'ini TR (<c>DD.MM.YYYY</c>) ve ISO-8601 (<c>YYYY-MM-DD</c>) +
/// yaygın EN (<c>MM/DD/YYYY</c>) varyasyonlarını tolerans ile parse eder
/// (spec §6.3). Xlsx'te tarih zaten DateTime geliyor — bu detector sadece
/// CSV / string input'lar için.
/// </summary>
public static class DateFormatDetector
{
    /// <summary>
    /// Deneme formatları — sıralı, ilk eşleşen kazanır. Ambiguous (örn.
    /// <c>01/02/2026</c>) için TR öncelikli (DD.MM.YYYY varyantı).
    /// </summary>
    private static readonly string[] Formats =
    [
        "yyyy-MM-dd",                    // ISO-8601
        "yyyy-MM-ddTHH:mm:ss",           // ISO-8601 datetime
        "yyyy-MM-ddTHH:mm:ssK",          // ISO-8601 with offset
        "yyyy-MM-dd HH:mm:ss",           // ISO-8601 with space
        "dd.MM.yyyy",                    // TR standart
        "dd.MM.yyyy HH:mm:ss",
        "d.M.yyyy",                      // TR tek hane
        "dd/MM/yyyy",                    // TR slash varyant
        "dd-MM-yyyy",                    // TR tire varyant
        "MM/dd/yyyy",                    // EN (US)
        "M/d/yyyy",                      // EN (US) tek hane
    ];

    /// <summary>
    /// Tarih parse dener. Başarısız → <see cref="FormatException"/>.
    /// Sadece tarih (time olmayan) input'lar için de çalışır.
    /// </summary>
    public static DateOnly ParseDate(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            throw new ArgumentException("empty date", nameof(input));

        var trimmed = input.Trim();

        foreach (var fmt in Formats)
        {
            if (DateTime.TryParseExact(trimmed, fmt, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var dt))
            {
                return DateOnly.FromDateTime(dt);
            }
        }

        // Son çare — InvariantCulture relaxed
        if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var fallback))
        {
            return DateOnly.FromDateTime(fallback);
        }

        throw new FormatException($"unrecognized date format: '{input}'");
    }

    public static bool TryParseDate(string input, out DateOnly value)
    {
        try
        {
            value = ParseDate(input);
            return true;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException)
        {
            value = default;
            return false;
        }
    }

    /// <summary>YYYY-MM period_code parse — separate validation from full date.</summary>
    public static bool IsValidPeriodCode(string input)
    {
        if (string.IsNullOrWhiteSpace(input) || input.Length != 7) return false;
        if (input[4] != '-') return false;
        if (!int.TryParse(input[..4], out var year) || year is < 2000 or > 2100) return false;
        if (!int.TryParse(input[5..], out var month) || month is < 1 or > 12) return false;
        return true;
    }
}
