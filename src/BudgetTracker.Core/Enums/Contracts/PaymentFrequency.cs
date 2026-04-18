namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #10 — Ödeme Şekli (3-4 karakter). Primin hangi
/// frekansta tahsil edildiğini kodlar. ADR-0014 §2.7: T365 değeri kontrat
/// kodunda spec örnekleriyle uyumlu olarak T'siz (`365`) render edilir;
/// parser ikisini de (`T365`, `365`) kabul eder.
/// </summary>
public enum PaymentFrequency
{
    /// <summary>Peşin — `P00`.</summary>
    UpFront = 0,

    /// <summary>Aylık (1/12) — `T12`.</summary>
    Monthly = 1,

    /// <summary>Altı Aylık (1/6, 6 taksit) — `T02`.</summary>
    BiMonthly = 2,

    /// <summary>Üç Aylık (1/4, 4 taksit) — `T03`.</summary>
    Quarterly = 3,

    /// <summary>Günlük (1/365) — kodda `365` olarak render.</summary>
    Daily = 4,

    /// <summary>Diğer — `T01`.</summary>
    Other = 5
}
