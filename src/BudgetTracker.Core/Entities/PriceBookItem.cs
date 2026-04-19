using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.PriceBooks;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// PriceBook kalem girdisi (00b §2.1). <c>(price_book_id, product_code)</c> unique.
/// <see cref="UnitPrice"/> 4 ondalık (küçük birim fiyatları için).
/// </summary>
public sealed class PriceBookItem : BaseEntity
{
    public int PriceBookId { get; private set; }
    public string ProductCode { get; private set; } = default!;
    public string ProductName { get; private set; } = default!;
    public PriceBookItemType ItemType { get; private set; }
    public string Unit { get; private set; } = default!;
    public decimal UnitPrice { get; private set; }
    public string CurrencyCode { get; private set; } = "TRY";
    public decimal? TaxRate { get; private set; }
    public decimal? MinQuantity { get; private set; }
    public string? Notes { get; private set; }

    private PriceBookItem() { }

    public static PriceBookItem Create(
        int priceBookId,
        string productCode,
        string productName,
        PriceBookItemType itemType,
        string unit,
        decimal unitPrice,
        string currencyCode,
        DateTimeOffset createdAt,
        int? createdByUserId,
        decimal? taxRate = null,
        decimal? minQuantity = null,
        string? notes = null)
    {
        // priceBookId = 0, parent aggregate henüz persist edilmediğinde (new Draft
        // + AddItem) geçerli. EF FK constraint'i insert sırasında zorlar.
        if (priceBookId < 0) throw new ArgumentOutOfRangeException(nameof(priceBookId));
        ArgumentException.ThrowIfNullOrWhiteSpace(productCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(productName);
        ArgumentException.ThrowIfNullOrWhiteSpace(unit);
        if (unitPrice < 0m)
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "unit price must be non-negative");
        if (taxRate is < 0m or > 100m)
            throw new ArgumentOutOfRangeException(nameof(taxRate), "tax rate must be 0-100");
        if (minQuantity is < 0m)
            throw new ArgumentOutOfRangeException(nameof(minQuantity), "min quantity must be non-negative");

        return new PriceBookItem
        {
            PriceBookId = priceBookId,
            ProductCode = productCode.Trim(),
            ProductName = productName.Trim(),
            ItemType = itemType,
            Unit = unit.Trim().ToUpperInvariant(),
            UnitPrice = unitPrice,
            CurrencyCode = string.IsNullOrWhiteSpace(currencyCode) ? "TRY" : currencyCode.Trim().ToUpperInvariant(),
            TaxRate = taxRate,
            MinQuantity = minQuantity,
            Notes = notes,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void Update(
        string productName,
        PriceBookItemType itemType,
        string unit,
        decimal unitPrice,
        string currencyCode,
        int actorUserId,
        DateTimeOffset updatedAt,
        decimal? taxRate = null,
        decimal? minQuantity = null,
        string? notes = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(productName);
        ArgumentException.ThrowIfNullOrWhiteSpace(unit);
        if (unitPrice < 0m)
            throw new ArgumentOutOfRangeException(nameof(unitPrice));
        if (taxRate is < 0m or > 100m)
            throw new ArgumentOutOfRangeException(nameof(taxRate));
        if (minQuantity is < 0m)
            throw new ArgumentOutOfRangeException(nameof(minQuantity));

        ProductName = productName.Trim();
        ItemType = itemType;
        Unit = unit.Trim().ToUpperInvariant();
        UnitPrice = unitPrice;
        CurrencyCode = string.IsNullOrWhiteSpace(currencyCode) ? CurrencyCode : currencyCode.Trim().ToUpperInvariant();
        TaxRate = taxRate;
        MinQuantity = minQuantity;
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
