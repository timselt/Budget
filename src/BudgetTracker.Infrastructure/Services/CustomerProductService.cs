using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.CustomerProducts;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CustomerProductService : ICustomerProductService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public CustomerProductService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<CustomerProductDto>> GetByCustomerAsync(
        int customerId, bool? onlyActive, CancellationToken cancellationToken)
    {
        var query =
            from cp in _db.CustomerProducts
            join product in _db.Products on cp.ProductId equals product.Id
            join category in _db.ProductCategories on product.ProductCategoryId equals category.Id
            where cp.CustomerId == customerId
            select new { cp, product, category };

        if (onlyActive == true)
        {
            query = query.Where(x => x.cp.IsActive);
        }

        return await query
            .OrderBy(x => x.category.DisplayOrder)
            .ThenBy(x => x.product.DisplayOrder)
            .ThenBy(x => x.product.Name)
            .Select(x => new CustomerProductDto(
                x.cp.Id,
                x.cp.CustomerId,
                x.cp.ProductId,
                x.product.Code,
                x.product.Name,
                x.product.ProductCategoryId,
                x.category.Name,
                x.cp.UnitPriceTry,
                x.cp.StartDate,
                x.cp.EndDate,
                x.cp.Notes,
                x.cp.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerProductDto?> GetByIdAsync(int customerId, int id, CancellationToken cancellationToken)
    {
        return await (
            from cp in _db.CustomerProducts
            join product in _db.Products on cp.ProductId equals product.Id
            join category in _db.ProductCategories on product.ProductCategoryId equals category.Id
            where cp.Id == id && cp.CustomerId == customerId
            select new CustomerProductDto(
                cp.Id,
                cp.CustomerId,
                cp.ProductId,
                product.Code,
                product.Name,
                product.ProductCategoryId,
                category.Name,
                cp.UnitPriceTry,
                cp.StartDate,
                cp.EndDate,
                cp.Notes,
                cp.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CustomerProductDto> CreateAsync(
        int customerId, CreateCustomerProductRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = CustomerProduct.Create(
            _tenant.CurrentCompanyId!.Value,
            customerId,
            request.ProductId,
            _clock.UtcNow,
            actorUserId,
            request.UnitPriceTry,
            request.StartDate,
            request.EndDate,
            request.Notes);

        _db.CustomerProducts.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(customerId, entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("CustomerProduct was created but could not be reloaded.");
    }

    public async Task<CustomerProductDto> UpdateAsync(
        int customerId, int id, UpdateCustomerProductRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.CustomerProducts
            .FirstOrDefaultAsync(cp => cp.Id == id && cp.CustomerId == customerId, cancellationToken)
            ?? throw new InvalidOperationException($"CustomerProduct {id} not found for customer {customerId}");

        entity.Update(
            actorUserId,
            _clock.UtcNow,
            request.IsActive,
            request.UnitPriceTry,
            request.StartDate,
            request.EndDate,
            request.Notes);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(customerId, entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("CustomerProduct was updated but could not be reloaded.");
    }

    public async Task DeleteAsync(int customerId, int id, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.CustomerProducts
            .FirstOrDefaultAsync(cp => cp.Id == id && cp.CustomerId == customerId, cancellationToken)
            ?? throw new InvalidOperationException($"CustomerProduct {id} not found for customer {customerId}");

        entity.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
