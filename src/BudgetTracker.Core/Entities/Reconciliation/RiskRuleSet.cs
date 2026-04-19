using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Risk kuralı konfigürasyonu (Faz 1 spec §8) — flow bazlı gecikme eşikleri.
/// Excel analizinde otomotiv ve sigorta'nın risk eşikleri farklı olduğu
/// gözlemlendi; bu kod yerine konfigürasyon olarak tutulur.
/// <b>Sprint 1 iskelet:</b> tablo + base alanlar; varsayılan satırlar
/// (Insurance: 30/90 gün, Automotive: 10/90 gün) seed sırasında eklenir.
/// </summary>
public sealed class RiskRuleSet : BaseEntity
{
    public ReconciliationFlow Flow { get; private set; }

    /// <summary>"Düşük" → "Orta" geçişi (gün).</summary>
    public int LowToMediumDays { get; private set; }

    /// <summary>"Orta" → "Yüksek" geçişi (gün).</summary>
    public int MediumToHighDays { get; private set; }

    /// <summary>Bu kuralın yürürlük başlangıcı.</summary>
    public DateOnly EffectiveFrom { get; private set; }

    /// <summary>Bu kuralın yürürlük bitişi (null = açık uçlu, hâlâ geçerli).</summary>
    public DateOnly? EffectiveTo { get; private set; }

    private RiskRuleSet() { }

    public static RiskRuleSet Create(
        ReconciliationFlow flow,
        int lowToMediumDays,
        int mediumToHighDays,
        DateOnly effectiveFrom,
        int updatedByUserId,
        DateTimeOffset createdAt,
        DateOnly? effectiveTo = null)
    {
        if (lowToMediumDays <= 0) throw new ArgumentOutOfRangeException(nameof(lowToMediumDays));
        if (mediumToHighDays <= lowToMediumDays)
            throw new ArgumentException(
                "medium_to_high_days must be greater than low_to_medium_days",
                nameof(mediumToHighDays));
        if (effectiveTo is not null && effectiveTo.Value < effectiveFrom)
            throw new ArgumentException("effective_to cannot precede effective_from");
        if (updatedByUserId <= 0) throw new ArgumentOutOfRangeException(nameof(updatedByUserId));

        // BaseEntity.UpdatedByUserId / UpdatedAt yeni kayıtta null —
        // ilk gerçek konfigürasyon değişikliğinde dolar. Spec §8'in
        // "updated_by zorunlu" semantiği update operasyonu için (her
        // değişikliğin sahibi belli olmalı).
        return new RiskRuleSet
        {
            Flow = flow,
            LowToMediumDays = lowToMediumDays,
            MediumToHighDays = mediumToHighDays,
            EffectiveFrom = effectiveFrom,
            EffectiveTo = effectiveTo,
            CreatedAt = createdAt,
            CreatedByUserId = updatedByUserId,
        };
    }
}
