namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #13 — Hizmet Alanı (1 karakter). Kontratın coğrafi
/// kapsamını (yurt içi veya yurt dışı) ifade eder.
/// </summary>
public enum ServiceArea
{
    /// <summary>Yurt İçi — `1`.</summary>
    Domestic = 1,

    /// <summary>Yurt Dışı — `2`.</summary>
    International = 2
}
