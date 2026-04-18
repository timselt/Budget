namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #2 — İş Kolu (1 karakter). Tur Assist'in operasyonel
/// hizmet kolunu temsil eder; kontrat kodunda segment olarak rakamla render
/// edilir (`1`, `2`, …, `7`, `0`).
/// </summary>
public enum BusinessLine
{
    /// <summary>Diğer — kontrat kodunda `0`.</summary>
    Other = 0,

    /// <summary>RSA / Yol Yardım — kontrat kodunda `1`.</summary>
    RoadSideAssistance = 1,

    /// <summary>RAC / İkame Araç (Rent a Car) — kontrat kodunda `2`.</summary>
    RentACar = 2,

    /// <summary>Konut &amp; İşyeri — kontrat kodunda `3`.</summary>
    HomeAndWorkplace = 3,

    /// <summary>Sağlık — kontrat kodunda `4`.</summary>
    Health = 4,

    /// <summary>Yat — kontrat kodunda `5`.</summary>
    Yacht = 5,

    /// <summary>Çağrı Merkezi — kontrat kodunda `6`.</summary>
    CallCenter = 6,

    /// <summary>Seyahat — kontrat kodunda `7`.</summary>
    Travel = 7
}
