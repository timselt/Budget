namespace BudgetTracker.Application.PriceBooks;

/// <summary>
/// Toplu PriceBook item ekleme (00b §3.2). <see cref="ReplaceExisting"/> true ise
/// Draft'taki mevcut item'lar silinip yenileriyle değiştirilir; false ise append.
/// Yalnızca Draft PriceBook'ta çalışır.
/// </summary>
public sealed record BulkAddItemsRequest(
    IReadOnlyList<PriceBookItemInput> Items,
    bool ReplaceExisting = true);

public sealed record PriceBookItemInput(
    string ProductCode,
    string ProductName,
    string ItemType,
    string Unit,
    decimal UnitPrice,
    string? CurrencyCode = null,
    decimal? TaxRate = null,
    decimal? MinQuantity = null,
    string? Notes = null);
