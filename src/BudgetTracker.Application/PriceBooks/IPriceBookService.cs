namespace BudgetTracker.Application.PriceBooks;

/// <summary>PriceBook CRUD + sürüm yaşam döngüsü (00b §3.2).</summary>
public interface IPriceBookService
{
    Task<IReadOnlyList<PriceBookDto>> GetByContractAsync(
        int contractId, CancellationToken cancellationToken);

    Task<PriceBookDetailDto?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<PriceBookDto> CreateDraftAsync(
        int contractId,
        CreatePriceBookRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PriceBookItemDto>> BulkAddItemsAsync(
        int priceBookId,
        BulkAddItemsRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Draft → Active. Aynı sözleşmede Active bir sürüm varsa Archived'a taşınır
    /// (<c>effective_to</c> yeni sürümün <c>effective_from - 1</c>'i yapılır).
    /// </summary>
    Task<PriceBookDto> ApproveAsync(
        int priceBookId, int actorUserId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PriceBookItemDto>> GetItemsAsync(
        int priceBookId, string? productCode, CancellationToken cancellationToken);
}
