namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #8 — Sözleşme Tipi (2 haneli). Kontratın operasyonel
/// yapısını (poliçe başı, dosya başı, dedike/havuz ekip) kodlar.
/// </summary>
public enum ContractType
{
    /// <summary>Poliçe Başı — `01`.</summary>
    PerPolicy = 1,

    /// <summary>Dosya Başı / Tarife (Riskli) — `02`.</summary>
    PerFileRisky = 2,

    /// <summary>Dosya Başı / Risksiz — `03`.</summary>
    PerFileRiskless = 3,

    /// <summary>Dedike Ekip — `04`.</summary>
    DedicatedTeam = 4,

    /// <summary>Havuz Ekibi — `05`.</summary>
    PooledTeam = 5
}
