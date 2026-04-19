namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Ham dosyayı (xlsx/csv) başlık + satır dizisine çeviren low-level okuyucu.
/// Template'e (sigorta/otomotiv) bağımsız — sadece kolon→değer map döner.
/// Parser pipeline: StreamReader → ColumnMappingResolver → template validator.
/// </summary>
public interface IImportStreamReader
{
    /// <summary>
    /// Dosyayı okur ve her satır için normalize edilmemiş kolon→değer map'i
    /// döner. Başlık satırı ilk 2 satıra kadar tolere edilir (spec §6.3).
    /// Tamamen boş satırlar atlanır. Dosya açılamıyor/okunamıyorsa
    /// <see cref="ImportReadException"/> fırlatılır.
    /// </summary>
    /// <param name="stream">Dosya stream'i.</param>
    /// <param name="maxRows">
    /// MVP sınırı (spec §6.1: 20.000). Aşılırsa ek satırlar sessizce kesilir
    /// ve <see cref="ImportReadResult.Truncated"/> true döner.
    /// </param>
    /// <param name="cancellationToken">İptal token.</param>
    /// <returns>Başlık adları + ham satırlar (string değerler).</returns>
    Task<ImportReadResult> ReadAsync(
        Stream stream,
        int maxRows,
        CancellationToken cancellationToken = default);
}

/// <summary>Stream okuma sonucu — başlık + satırlar + truncation flag.</summary>
public sealed record ImportReadResult(
    IReadOnlyList<string> Headers,
    IReadOnlyList<IReadOnlyDictionary<string, string?>> Rows,
    bool Truncated);

/// <summary>Dosya açma / bozuk format / beklenmeyen IO hataları için.</summary>
public sealed class ImportReadException : Exception
{
    public ImportReadException(string message) : base(message) { }
    public ImportReadException(string message, Exception inner) : base(message, inner) { }
}
