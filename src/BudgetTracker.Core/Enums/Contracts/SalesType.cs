namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #3 — Satış Tipi (2 karakter). Kontrat'ın hangi satış
/// kanalından geldiğini gösterir; müşterinin <c>Segment.Code</c> değeriyle
/// sıklıkla (ama birebir değil) eşleşir. Aynı müşteri farklı kontratlarda
/// farklı satış tipi taşıyabilir.
/// </summary>
public enum SalesType
{
    /// <summary>Sigorta — `SG`.</summary>
    Insurance = 0,

    /// <summary>Otomotiv — `OM`.</summary>
    Automotive = 1,

    /// <summary>Alternatif Kanallar (Direkt Kanal) — `DK`.</summary>
    DirectChannel = 2,

    /// <summary>Filo — `OF`.</summary>
    Fleet = 3,

    /// <summary>Sağlık (Medikal) — `MD`.</summary>
    Medical = 4
}
