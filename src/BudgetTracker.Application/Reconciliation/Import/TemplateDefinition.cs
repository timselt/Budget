using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Bir kolon için canonical ad + alias listesi + tip + zorunluluk.
/// </summary>
public sealed record ColumnDefinition(
    string CanonicalName,
    IReadOnlyList<string> Aliases,
    ColumnValueType ValueType,
    bool IsRequired,
    string? Description = null)
{
    /// <summary>
    /// Header alias resolver için tüm bilinen isimleri döndürür (canonical
    /// adı da dahil — explicit reference).
    /// </summary>
    public IReadOnlyList<string> AllNames =>
        Aliases.Contains(CanonicalName, StringComparer.Ordinal)
            ? Aliases
            : new List<string>(Aliases) { CanonicalName };
}

/// <summary>
/// Kolon değer tipi — validator hangi parser'ı çağıracağını bilir.
/// </summary>
public enum ColumnValueType
{
    String = 0,
    Integer = 1,
    Decimal = 2,
    Date = 3,

    /// <summary>YYYY-MM (7 karakter) — period_code özel formatı.</summary>
    PeriodCode = 4,
}

/// <summary>
/// Bir mutabakat şablonu (sigorta veya otomotiv) — flow + kolon listesi.
/// Resolver + validator bu tanımı tüketir.
/// </summary>
public sealed class TemplateDefinition
{
    public ReconciliationFlow Flow { get; }
    public IReadOnlyList<ColumnDefinition> Columns { get; }

    public TemplateDefinition(ReconciliationFlow flow, IReadOnlyList<ColumnDefinition> columns)
    {
        ArgumentNullException.ThrowIfNull(columns);
        if (columns.Count == 0)
            throw new ArgumentException("at least one column required", nameof(columns));
        Flow = flow;
        Columns = columns;
    }

    /// <summary>Resolver için canonical → alias listesi map'i.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<string>> AsAliasMap()
    {
        var dict = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        foreach (var c in Columns)
        {
            dict[c.CanonicalName] = c.AllNames;
        }
        return dict;
    }

    public ColumnDefinition? FindColumn(string canonicalName) =>
        Columns.FirstOrDefault(c =>
            string.Equals(c.CanonicalName, canonicalName, StringComparison.Ordinal));
}
