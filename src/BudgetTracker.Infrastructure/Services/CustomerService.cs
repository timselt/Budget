using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Customers;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public CustomerService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _db.Customers
            .Select(c => new CustomerDto(
                c.Id, c.Code, c.Name, c.SegmentId, null,
                c.StartDate, c.EndDate, c.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Customers
            .Where(c => c.Id == id)
            .Select(c => new CustomerDto(
                c.Id, c.Code, c.Name, c.SegmentId, null,
                c.StartDate, c.EndDate, c.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CustomerDto> CreateAsync(
        CreateCustomerRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = Customer.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Code,
            request.Name,
            request.SegmentId,
            actorUserId,
            _clock.UtcNow,
            request.StartDate,
            request.EndDate,
            notes: request.Notes);

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(cancellationToken);

        return new CustomerDto(
            customer.Id, customer.Code, customer.Name, customer.SegmentId, null,
            customer.StartDate, customer.EndDate, customer.IsActive);
    }

    public async Task<CustomerDto> UpdateAsync(
        int id, UpdateCustomerRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {id} not found");

        customer.Update(request.Name, request.SegmentId, request.StartDate,
            request.EndDate, request.Notes, request.IsActive, actorUserId, _clock.UtcNow);

        await _db.SaveChangesAsync(cancellationToken);

        return new CustomerDto(
            customer.Id, customer.Code, customer.Name, customer.SegmentId, null,
            customer.StartDate, customer.EndDate, customer.IsActive);
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {id} not found");

        customer.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
