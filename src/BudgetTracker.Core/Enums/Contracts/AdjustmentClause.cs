namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #11 — Ayarlama Klozu / Teklif Çalışma Seçeneği
/// (1 karakter). Kontratın yıl içinde prim ayarlamasına açık olup olmadığını
/// belirtir.
/// </summary>
public enum AdjustmentClause
{
    /// <summary>Ayarlama Klozlu — `1`.</summary>
    WithClause = 1,

    /// <summary>Ayarlama Klozsuz — `2`.</summary>
    WithoutClause = 2
}
