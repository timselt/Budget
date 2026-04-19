using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Case içindeki fatura kalemi (Faz 1 spec §3.5). <b>Sprint 1 iskelet:</b>
/// tablo + base alanlar; otomatik PriceBook eşleşmesi ve PendingReview →
/// Ready geçişi Sprint 2'de gelir.
/// </summary>
public sealed class ReconciliationLine : BaseEntity
{
    public int CaseId { get; private set; }
    public int SourceRowId { get; private set; }

    public string ProductCode { get; private set; } = string.Empty;
    public string ProductName { get; private set; } = string.Empty;
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "TRY";

    /// <summary>Sözleşme + PriceBook item referansı (örn. "PB#42-Item#12").</summary>
    public string PriceSourceRef { get; private set; } = string.Empty;

    public ReconciliationLineStatus Status { get; private set; }
    public DisputeReasonCode? DisputeReasonCode { get; private set; }
    public string? DisputeNote { get; private set; }

    private ReconciliationLine() { }

    /// <summary>Sprint 1 iskelet factory — fixture amaçlı + Sprint 2 PendingReview lines.</summary>
    public static ReconciliationLine Create(
        int caseId,
        int sourceRowId,
        string productCode,
        string productName,
        decimal quantity,
        decimal unitPrice,
        string currencyCode,
        string priceSourceRef,
        DateTimeOffset createdAt)
    {
        if (caseId <= 0) throw new ArgumentOutOfRangeException(nameof(caseId));
        if (sourceRowId <= 0) throw new ArgumentOutOfRangeException(nameof(sourceRowId));
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        if (unitPrice < 0) throw new ArgumentOutOfRangeException(nameof(unitPrice));

        return new ReconciliationLine
        {
            CaseId = caseId,
            SourceRowId = sourceRowId,
            ProductCode = productCode,
            ProductName = productName,
            Quantity = quantity,
            UnitPrice = unitPrice,
            Amount = decimal.Round(quantity * unitPrice, 2, MidpointRounding.ToEven),
            CurrencyCode = currencyCode,
            PriceSourceRef = priceSourceRef,
            Status = ReconciliationLineStatus.PendingReview,
            CreatedAt = createdAt,
        };
    }

    /// <summary>
    /// Sprint 2 Task 5 — PriceBook lookup sonrası Line'ı Ready'e geçirir.
    /// unit_price sözleşmedeki değer, price_source_ref "PB#{id}-V{ver}-Item#{itemId}"
    /// formatında.
    /// </summary>
    public void ResolveAsReady(decimal unitPrice, string priceSourceRef, DateTimeOffset resolvedAt)
    {
        if (Status != ReconciliationLineStatus.PendingReview)
        {
            throw new InvalidOperationException(
                $"only PendingReview line can be resolved (current: {Status}).");
        }
        if (unitPrice < 0) throw new ArgumentOutOfRangeException(nameof(unitPrice));
        ArgumentException.ThrowIfNullOrWhiteSpace(priceSourceRef);

        UnitPrice = unitPrice;
        Amount = decimal.Round(Quantity * unitPrice, 2, MidpointRounding.ToEven);
        PriceSourceRef = priceSourceRef;
        Status = ReconciliationLineStatus.Ready;
        UpdatedAt = resolvedAt;
    }

    /// <summary>
    /// Sprint 2 Task 5 — PriceBook'ta ürün var ama beyan edilen fiyat uyuşmuyor.
    /// Line sözleşme fiyatına atlanır; agent UI'da karar verir.
    /// </summary>
    public void ResolveAsPricingMismatch(
        decimal contractUnitPrice,
        string priceSourceRef,
        DateTimeOffset resolvedAt)
    {
        if (Status != ReconciliationLineStatus.PendingReview)
        {
            throw new InvalidOperationException(
                $"only PendingReview line can be resolved (current: {Status}).");
        }
        if (contractUnitPrice < 0) throw new ArgumentOutOfRangeException(nameof(contractUnitPrice));
        ArgumentException.ThrowIfNullOrWhiteSpace(priceSourceRef);

        UnitPrice = contractUnitPrice;
        Amount = decimal.Round(Quantity * contractUnitPrice, 2, MidpointRounding.ToEven);
        PriceSourceRef = priceSourceRef;
        Status = ReconciliationLineStatus.PricingMismatch;
        DisputeReasonCode = Core.Enums.Reconciliation.DisputeReasonCode.PriceMismatch;
        UpdatedAt = resolvedAt;
    }

    /// <summary>
    /// Sprint 2 Task 5 — Contract bulunamadı / ürün sözleşmede yok / birden fazla
    /// contract: Line reddedilir; agent manuel müdahale yapabilir.
    /// </summary>
    public void ResolveAsRejected(
        DisputeReasonCode reason,
        string note,
        DateTimeOffset resolvedAt)
    {
        if (Status != ReconciliationLineStatus.PendingReview)
        {
            throw new InvalidOperationException(
                $"only PendingReview line can be resolved (current: {Status}).");
        }
        ArgumentException.ThrowIfNullOrWhiteSpace(note);

        Status = ReconciliationLineStatus.Rejected;
        DisputeReasonCode = reason;
        DisputeNote = note;
        UpdatedAt = resolvedAt;
    }

    /// <summary>
    /// Sprint 2 Task 7 — agent inline edit: quantity ve/veya unit_price değiştirir.
    /// Sadece PendingReview veya PricingMismatch line'larda izin verilir (Ready
    /// sonrası Case müşteriye gönderilmek üzere; değişiklik dispute loop'una
    /// girer, Sprint 3 konusu).
    /// </summary>
    public void UpdateQuantityAndPrice(
        decimal? newQuantity,
        decimal? newUnitPrice,
        DateTimeOffset updatedAt)
    {
        if (Status is not (ReconciliationLineStatus.PendingReview or ReconciliationLineStatus.PricingMismatch))
        {
            throw new InvalidOperationException(
                $"line inline edit allowed only in PendingReview/PricingMismatch (current: {Status}).");
        }
        if (newQuantity.HasValue && newQuantity.Value <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(newQuantity), "quantity must be > 0");
        }
        if (newUnitPrice.HasValue && newUnitPrice.Value < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(newUnitPrice), "unit_price must be >= 0");
        }

        if (newQuantity.HasValue) Quantity = newQuantity.Value;
        if (newUnitPrice.HasValue) UnitPrice = newUnitPrice.Value;
        Amount = decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.ToEven);
        UpdatedAt = updatedAt;
    }

    /// <summary>
    /// Sprint 2 Task 7 — PricingMismatch line'ı Ready'e geçir (agent manuel onay).
    /// </summary>
    public void MarkReady(DateTimeOffset updatedAt)
    {
        if (Status != ReconciliationLineStatus.PricingMismatch)
        {
            throw new InvalidOperationException(
                $"only PricingMismatch line can be marked Ready (current: {Status}).");
        }
        Status = ReconciliationLineStatus.Ready;
        DisputeReasonCode = null;
        UpdatedAt = updatedAt;
    }
}
