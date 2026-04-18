namespace BudgetTracker.Application.CustomerProducts;

public interface ICustomerProductService
{
    Task<IReadOnlyList<CustomerProductDto>> GetByCustomerAsync(int customerId, bool? onlyActive, CancellationToken cancellationToken);
    Task<CustomerProductDto?> GetByIdAsync(int customerId, int id, CancellationToken cancellationToken);
    Task<CustomerProductDto> CreateAsync(int customerId, CreateCustomerProductRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<CustomerProductDto> UpdateAsync(int customerId, int id, UpdateCustomerProductRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int customerId, int id, int actorUserId, CancellationToken cancellationToken);
}
