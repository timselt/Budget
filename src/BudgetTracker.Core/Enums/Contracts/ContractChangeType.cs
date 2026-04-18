namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// ADR-0014 §2.3 — Kontratın revizyon sebebi. Operatör UI'dan revizyon
/// başlatırken seçer; <c>ContractRevisionService</c> bu değere göre
/// versiyon atlatır, aynı kodu korur veya tamamen yeni kontrat kodu
/// üretir.
/// </summary>
public enum ContractChangeType
{
    /// <summary>Limit değişikliği — aynı kod, versiyon atlar.</summary>
    LimitChange = 0,

    /// <summary>Sadece prim değişikliği — aynı kod, versiyon atlamaz.</summary>
    PriceChange = 1,

    /// <summary>Limit + prim birlikte değişti — aynı kod, versiyon atlar.</summary>
    LimitAndPrice = 2,

    /// <summary>
    /// Teminat kapsamı (yeni teminat kalemi, defa limiti, en yakın servis
    /// vb.) değişti — yeni <c>Product</c> (yeni 7-haneli ID) açılır,
    /// tamamen yeni kontrat kodu üretilir.
    /// </summary>
    CoverageChange = 3,

    /// <summary>İkame araç üretim bölünmesi — versiyon atlar.</summary>
    VehicleChange = 4,

    /// <summary>Dönem yenileme (yıl geçişi vb.) — versiyon atlar.</summary>
    PeriodRenewal = 5
}
