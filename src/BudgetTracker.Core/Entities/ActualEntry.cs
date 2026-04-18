using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class ActualEntry : TenantEntity
{
    public int BudgetYearId { get; private set; }
    public int CustomerId { get; private set; }

    /// <summary>
    /// Ürün bazlı actual kaydı için opsiyonel FK — ADR-0013 geçiş dönemi
    /// nullable. BudgetEntry.ProductId ile simetrik.
    /// </summary>
    public int? ProductId { get; private set; }

    public int Month { get; private set; }
    public EntryType EntryType { get; private set; }
    public decimal AmountOriginal { get; private set; }
    public string CurrencyCode { get; private set; } = default!;
    public decimal AmountTryFixed { get; private set; }
    public decimal AmountTrySpot { get; private set; }
    public ActualSource Source { get; private set; }
    public DateTimeOffset? SyncedAt { get; private set; }

    private ActualEntry() { }

    public static ActualEntry Create(
        int companyId,
        int budgetYearId,
        int customerId,
        int month,
        EntryType entryType,
        decimal amountOriginal,
        string currencyCode,
        decimal amountTryFixed,
        decimal amountTrySpot,
        ActualSource source,
        DateTimeOffset createdAt,
        DateTimeOffset? syncedAt = null,
        int? productId = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (budgetYearId <= 0) throw new ArgumentOutOfRangeException(nameof(budgetYearId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        if (productId is <= 0) throw new ArgumentOutOfRangeException(nameof(productId));
        if (month is < 1 or > 12)
            throw new ArgumentOutOfRangeException(nameof(month), "month must be between 1 and 12");
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));

        return new ActualEntry
        {
            CompanyId = companyId,
            BudgetYearId = budgetYearId,
            CustomerId = customerId,
            ProductId = productId,
            Month = month,
            EntryType = entryType,
            AmountOriginal = amountOriginal,
            CurrencyCode = currencyCode,
            AmountTryFixed = amountTryFixed,
            AmountTrySpot = amountTrySpot,
            Source = source,
            SyncedAt = syncedAt,
            CreatedAt = createdAt
        };
    }
}
