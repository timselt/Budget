namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu segment #5 — Araç Tipi (3 karakter). Kontratın teminat
/// kapsadığı araç sınıfını ya da araç tipinin geçerli olmadığı durum için
/// `000` boş değerini tutar. Kombine değerler (BH0, BHF, AÖ0) tek kontratın
/// birden fazla araç sınıfını kapsadığını ifade eder.
/// </summary>
public enum VehicleType
{
    /// <summary>Araç tipi geçerli değil (konut, yat, sağlık vb.) — `000`.</summary>
    None = 0,

    /// <summary>Binek — `B00`.</summary>
    Binek = 1,

    /// <summary>Hafif Ticari — `H00`.</summary>
    HafifTicari = 2,

    /// <summary>Ağır Ticari — `A00`.</summary>
    AgirTicari = 3,

    /// <summary>Özel Maksatlı — `ÖM0`.</summary>
    OzelMaksatli = 4,

    /// <summary>Motosiklet — `M00`.</summary>
    Motosiklet = 5,

    /// <summary>Ağır + Özel Maksatlı (kombine) — `AÖ0`.</summary>
    AgirVeOzelMaksatli = 6,

    /// <summary>Binek + Hafif (kombine) — `BH0`.</summary>
    BinekVeHafif = 7,

    /// <summary>Binek + Hafif + Ağır (kombine, tümü) — `BHF`.</summary>
    BinekHafifAgir = 8
}
