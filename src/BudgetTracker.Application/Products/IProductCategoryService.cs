namespace BudgetTracker.Application.Products;

public interface IProductCategoryService
{
    Task<IReadOnlyList<ProductCategoryDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<ProductCategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ProductCategoryDto> CreateAsync(CreateProductCategoryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<ProductCategoryDto> UpdateAsync(int id, UpdateProductCategoryRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
