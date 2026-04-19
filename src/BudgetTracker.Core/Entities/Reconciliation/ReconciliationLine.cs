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

    /// <summary>Sprint 1 iskelet factory — fixture amaçlı.</summary>
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
}
