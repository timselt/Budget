namespace BudgetTracker.Application.Customers;

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<CustomerDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<CustomerDto> UpdateAsync(int id, UpdateCustomerRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
