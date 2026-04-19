namespace BudgetTracker.Core.Enums.PriceBooks;

/// <summary>
/// PriceBook sürüm durumu (00b §2.1). Geçişler:
/// <c>Draft → Active (approve) → Archived (yeni sürüm onaylandığında otomatik)</c>.
/// Aynı <c>Contract</c> için tek <see cref="Active"/> garantisi EXCLUDE USING gist
/// ile DB seviyesinde.
/// </summary>
public enum PriceBookStatus
{
    Draft = 0,
    Active = 1,
    Archived = 2
}
