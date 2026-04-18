namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #4 — Ürün Tipi (2 karakter). Kontratın teminat
/// türünü kodlar. ADR-0014 §2.2: Bu alan <c>Product</c> katalog satırında
/// değil, satış anında <c>Contract</c> satırında tutulur (aynı ürün farklı
/// türde kontratta satılabilir).
/// </summary>
public enum ProductType
{
    /// <summary>Kasko — `K0`.</summary>
    Kasko = 0,

    /// <summary>Trafik — `T0`.</summary>
    Trafik = 1,

    /// <summary>Garanti — `G0`.</summary>
    Garanti = 2,

    /// <summary>Warranty — `W0`.</summary>
    Warranty = 3,

    /// <summary>Bireysel — `B0`.</summary>
    Bireysel = 4,

    /// <summary>Filo — `F0`.</summary>
    Filo = 5,

    /// <summary>İş Yeri Acil — `İ0`.</summary>
    IsYeriAcil = 6,

    /// <summary>Konut Acil — `K1`.</summary>
    KonutAcil = 7,

    /// <summary>Ferdi Kaza — `FK`.</summary>
    FerdiKaza = 8,

    /// <summary>Konut Onarım — `K2`.</summary>
    KonutOnarim = 9,

    /// <summary>İş Yeri Onarım — `İ1`.</summary>
    IsYeriOnarim = 10,

    /// <summary>Yat — `Y0`.</summary>
    Yat = 11,

    /// <summary>Diğer — `D0`.</summary>
    Diger = 12
}
