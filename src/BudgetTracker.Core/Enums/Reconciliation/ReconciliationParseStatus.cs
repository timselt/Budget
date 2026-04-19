namespace BudgetTracker.Core.Enums.Reconciliation;

/// <summary>
/// SourceRow parse sonucu (Faz 1 spec §3.3). Hatalı satır batch'i düşürmez;
/// Error olarak kaydedilir, agent UI'da inceler.
/// </summary>
public enum ReconciliationParseStatus
{
    /// <summary>Tüm zorunlu alanlar dolu, format geçerli.</summary>
    Ok = 0,

    /// <summary>Opsiyonel alanlarda eksik veya format toleransı kullanıldı.</summary>
    Warning = 1,

    /// <summary>Zorunlu alan eksik veya format reddedildi; satır işleme alınmaz.</summary>
    Error = 2,
}
