using System.Globalization;
using System.Text;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Başlık satırındaki kolon adlarını normalize edip canonical kolon adına
/// eşler (spec §6.3). Tolere edilen varyasyonlar:
/// <list type="bullet">
///   <item>Büyük-küçük harf: <c>POLICY_NO</c>, <c>Policy_No</c>, <c>policy_no</c></item>
///   <item>Türkçe karakter: <c>müşteri_kodu</c> ↔ <c>musteri_kodu</c></item>
///   <item>Boşluk / alt çizgi: <c>policy no</c> ↔ <c>policy_no</c></item>
///   <item>Alias: <c>müşteri_kodu</c> ↔ <c>logo_kodu</c> ↔ <c>external_customer_ref</c></item>
/// </list>
/// </summary>
public sealed class ColumnMappingResolver
{
    private readonly IReadOnlyDictionary<string, string> _aliasToCanonical;

    /// <summary>
    /// <paramref name="aliases"/>: canonical kolon → tanınan varyasyon listesi.
    /// Canonical adın kendisi de listeye dahil edilmelidir (explicit).
    /// </summary>
    public ColumnMappingResolver(IReadOnlyDictionary<string, IReadOnlyList<string>> aliases)
    {
        ArgumentNullException.ThrowIfNull(aliases);
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (canonical, variants) in aliases)
        {
            foreach (var v in variants)
            {
                var key = Normalize(v);
                if (map.TryGetValue(key, out var existing) && existing != canonical)
                {
                    throw new InvalidOperationException(
                        $"alias collision: '{v}' (normalized '{key}') maps to both " +
                        $"'{existing}' and '{canonical}'.");
                }
                map[key] = canonical;
            }
        }
        _aliasToCanonical = map;
    }

    /// <summary>Tek header değerini canonical'e çözer; bilinmiyorsa null.</summary>
    public string? Resolve(string header)
    {
        if (string.IsNullOrWhiteSpace(header)) return null;
        return _aliasToCanonical.TryGetValue(Normalize(header), out var canonical)
            ? canonical
            : null;
    }

    /// <summary>
    /// Tüm başlık listesini canonical → index eşlemesine çevirir.
    /// Birden fazla header aynı canonical'e map'lenirse exception
    /// (duplicate kolon ambiguity).
    /// </summary>
    public IReadOnlyDictionary<string, int> ResolveAll(IReadOnlyList<string> headers)
    {
        ArgumentNullException.ThrowIfNull(headers);
        var result = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var i = 0; i < headers.Count; i++)
        {
            var canonical = Resolve(headers[i]);
            if (canonical is null) continue;
            if (result.TryGetValue(canonical, out var existingIndex))
            {
                throw new InvalidOperationException(
                    $"duplicate column mapping: '{headers[i]}' and " +
                    $"'{headers[existingIndex]}' both resolve to '{canonical}'.");
            }
            result[canonical] = i;
        }
        return result;
    }

    /// <summary>
    /// Normalize: Türkçe karakter diakritik kaldırma + lowercase +
    /// boşluk/alt çizgi/tire birleşik kaldırma.
    /// Örn. <c>"Müşteri Kodu"</c> → <c>"musterikodu"</c>;
    /// <c>"external_customer_ref"</c> → <c>"externalcustomerref"</c>.
    /// Public — unit test'lerden alias normalize davranışı doğrulanır.
    /// </summary>
    public static string Normalize(string value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;

        // Türkçe özel dönüşüm (Unicode normalization'dan önce) — dotted/dotless
        // i ve ayırıcı karakterler için culture-invariant lowercase yeterli
        // değil; direkt harf eşleme yapıyoruz.
        var preprocessed = value
            .Replace("İ", "I", StringComparison.Ordinal)
            .Replace("ı", "i", StringComparison.Ordinal)
            .Replace("Ş", "S", StringComparison.Ordinal).Replace("ş", "s", StringComparison.Ordinal)
            .Replace("Ğ", "G", StringComparison.Ordinal).Replace("ğ", "g", StringComparison.Ordinal)
            .Replace("Ü", "U", StringComparison.Ordinal).Replace("ü", "u", StringComparison.Ordinal)
            .Replace("Ö", "O", StringComparison.Ordinal).Replace("ö", "o", StringComparison.Ordinal)
            .Replace("Ç", "C", StringComparison.Ordinal).Replace("ç", "c", StringComparison.Ordinal);

        // Unicode normalization — accents ve ilişkili diakritik kaldır.
        var decomposed = preprocessed.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category == UnicodeCategory.NonSpacingMark) continue;

            // Ayırıcı karakterleri (boşluk, tire, alt çizgi, nokta) at.
            if (c is ' ' or '_' or '-' or '.' or '\t') continue;

            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }
}
