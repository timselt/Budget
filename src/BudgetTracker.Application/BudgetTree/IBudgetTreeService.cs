namespace BudgetTracker.Application.BudgetTree;

/// <summary>
/// Bütçe planlama sol-panel ağacı + aylık kırılımları tek çağrıda üretir.
/// Veriler tek version üzerinden okunur; aggregation Application katmanında
/// yapılır (materialized view kullanılmıyor, bkz. docs/schema-mapping.md §1).
/// </summary>
public interface IBudgetTreeService
{
    Task<BudgetTreeDto> GetAsync(int versionId, CancellationToken cancellationToken);

    /// <summary>
    /// Müşteri başına özet: aktif sözleşme sayısı + Loss Ratio + YTD
    /// toplamlar. BudgetEntryPage sağ panel müşteri meta-satırı için.
    /// </summary>
    Task<CustomerBudgetSummaryDto> GetCustomerSummaryAsync(
        int customerId,
        int versionId,
        CancellationToken cancellationToken);
}

/// <summary>
/// Seçili müşterinin bu version üzerindeki özet KPI'ları. ADR-0014 sonrası
/// <see cref="ActiveContractCount"/> Contract entity'sinden gelecek; şu an
/// <c>CustomerProduct.IsActive</c> sayımı.
/// </summary>
public sealed record CustomerBudgetSummaryDto(
    int CustomerId,
    string CustomerCode,
    string CustomerName,
    int ActiveContractCount,
    decimal RevenueTotalTry,
    decimal ClaimTotalTry,
    decimal LossRatioPercent);
