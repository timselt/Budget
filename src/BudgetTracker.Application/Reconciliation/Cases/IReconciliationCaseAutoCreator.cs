namespace BudgetTracker.Application.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 4 — parse edilmiş batch üzerindeki SourceRow'ları Case + Line
/// olarak atomic üretir. Customer.ExternalCustomerRef eşleşmeyen satırlar
/// Case'e dahil edilmez; bu satırlar Task 8 UnmatchedCustomers bucket
/// endpoint'inden sorgulanır.
/// <para>
/// Aynı (company_id, flow, period_code, customer_id) tuple için birden fazla
/// çağrı halinde mevcut Case'e yeni Line'lar eklenir — unique constraint
/// ihlal etmez. Atomicity: tek explicit transaction; başarısız olursa tüm
/// Case/Line üretimi rollback.
/// </para>
/// </summary>
public interface IReconciliationCaseAutoCreator
{
    Task<CaseAutoCreateResult> CreateCasesForBatchAsync(
        int batchId,
        int companyId,
        int ownerUserId,
        CancellationToken cancellationToken = default);
}
