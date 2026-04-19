namespace BudgetTracker.Application.Authorization;

/// <summary>
/// Görev ayrılığı kuralını domain seviyesinde zorlayan altyapı.
/// Policy'ler rol bazlı yetkiyi denetler; bu guard ise aynı kullanıcının
/// "iki rolü birden" oynayamamasını garanti eder (örn. yaratıcı + onaylayıcı).
/// Kullanım yerleri (Sprint 1 + 00b sonrası):
/// - PriceBook create + approve
/// - Reconciliation case sahipliği + muhasebe export
/// </summary>
public interface ISegregationOfDutiesGuard
{
    /// <summary>
    /// <paramref name="creatorUserId"/> ile <paramref name="approverUserId"/> aynıysa
    /// <see cref="SegregationOfDutiesException"/> fırlatır. <paramref name="action"/>
    /// audit/exception mesajında bağlam için kullanılır (örn. "PriceBook.Approve").
    /// </summary>
    void EnsureDifferentActor(int creatorUserId, int approverUserId, string action);
}
