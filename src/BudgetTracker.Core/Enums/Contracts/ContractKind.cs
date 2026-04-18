namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #12 — Sözleşme Türü (2 karakter). Kontratın
/// reassurance/kesinti modelini belirtir: Clean Cut (dönem sonu net
/// kapanma) ya da Run Off (vaka tamamlanana kadar açık).
/// </summary>
public enum ContractKind
{
    /// <summary>Clean Cut — `CC`.</summary>
    CleanCut = 0,

    /// <summary>Run Off — `RO`.</summary>
    RunOff = 1
}
