namespace BudgetTracker.Application.Products;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetAllAsync(int? categoryId, bool? onlyActive, CancellationToken cancellationToken);
    Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ProductDto> CreateAsync(CreateProductRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<ProductDto> UpdateAsync(int id, UpdateProductRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
