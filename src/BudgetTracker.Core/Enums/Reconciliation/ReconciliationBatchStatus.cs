namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// Batch yaşam döngüsü (Faz 1 spec §4.3). Sprint 1'de Draft ve Parsed
/// kullanılır; Mapped (Sprint 2) ve Archived (Sprint 4) ileride aktif.
/// </summary>
public enum ReconciliationBatchStatus
{
    /// <summary>Yüklendi, parse edilmedi.</summary>
    Draft = 0,

    /// <summary>Parser SourceRow'ları çıkardı.</summary>
    Parsed = 1,

    /// <summary>Sprint 2: Case'lere dağıtıldı.</summary>
    Mapped = 2,

    /// <summary>Sprint 4: Tüm case'leri kapandı.</summary>
    Archived = 3,
}
