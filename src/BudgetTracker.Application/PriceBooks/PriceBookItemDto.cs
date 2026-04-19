namespace BudgetTracker.Application.PriceBooks;

/// <summary>PriceBook kalem DTO'su (00b §2.1).</summary>
public sealed record PriceBookItemDto(
    int Id,
    int PriceBookId,
    string ProductCode,
    string ProductName,
    string ItemType,
    string Unit,
    decimal UnitPrice,
    string CurrencyCode,
    decimal? TaxRate,
    decimal? MinQuantity,
    string? Notes);
