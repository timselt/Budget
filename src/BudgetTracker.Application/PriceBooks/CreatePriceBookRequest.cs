namespace BudgetTracker.Application.PriceBooks;

/// <summary>
/// Yeni PriceBook Draft oluşturma (00b §3.2). <see cref="CopyFromPreviousActive"/>
/// true ise son Active sürümün item'ları yeni Draft'a kopyalanır.
/// </summary>
public sealed record CreatePriceBookRequest(
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo = null,
    string? Notes = null,
    bool CopyFromPreviousActive = false);
