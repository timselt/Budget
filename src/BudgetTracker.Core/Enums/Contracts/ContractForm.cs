namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #7 — Sözleşme Şekli (2 haneli). Kontratın risk
/// profilini ifade eder; Tur Assist'in fiyatlandırma/rezerv politikasıyla
/// doğrudan bağlantılıdır.
/// </summary>
public enum ContractForm
{
    /// <summary>Riskli Ürünler — `01`.</summary>
    Risky = 1,

    /// <summary>Hizmet Bazlı — `02`.</summary>
    ServiceBased = 2,

    /// <summary>Al &amp; Sat — `03`.</summary>
    BuyAndSell = 3
}
