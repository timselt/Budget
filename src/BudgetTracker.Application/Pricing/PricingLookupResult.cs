using BudgetTracker.Application.PriceBooks;

namespace BudgetTracker.Application.Pricing;

/// <summary>
/// <c>/api/v1/pricing/lookup</c> sonuç tipi (00b §3.3).
/// <see cref="Match"/> enum'u import parser'ın satır statüsü atamasına doğrudan
/// mapping'lenebilir: Found→Ready, PricingMismatch→PricingMismatch, diğerleri→Rejected.
/// </summary>
public sealed record PricingLookupResult(
    string Match,
    int? ContractId,
    string? ContractCode,
    int? PriceBookId,
    int? PriceBookVersion,
    PriceBookItemDto? PriceBookItem,
    IReadOnlyList<string> Warnings);

public enum PricingLookupMatch
{
    Found,
    PricingMismatch,
    ContractNotFound,
    ProductNotFound,
    MultipleContracts
}
