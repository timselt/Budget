using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Products;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class ProductService : IProductService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public ProductService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync(
        int? categoryId, bool? onlyActive, CancellationToken cancellationToken)
    {
        var query =
            from product in _db.Products
            join category in _db.ProductCategories on product.ProductCategoryId equals category.Id
            select new { product, categoryName = category.Name };

        if (categoryId.HasValue)
        {
            query = query.Where(x => x.product.ProductCategoryId == categoryId.Value);
        }
        if (onlyActive == true)
        {
            query = query.Where(x => x.product.IsActive);
        }

        return await query
            .OrderBy(x => x.product.DisplayOrder)
            .ThenBy(x => x.product.Name)
            .Select(x => new ProductDto(
                x.product.Id,
                x.product.ProductCategoryId,
                x.categoryName,
                x.product.Code,
                x.product.Name,
                x.product.Description,
                x.product.CoverageTermsJson,
                x.product.DefaultCurrencyCode,
                x.product.DisplayOrder,
                x.product.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await (
            from product in _db.Products
            join category in _db.ProductCategories on product.ProductCategoryId equals category.Id
            where product.Id == id
            select new ProductDto(
                product.Id,
                product.ProductCategoryId,
                category.Name,
                product.Code,
                product.Name,
                product.Description,
                product.CoverageTermsJson,
                product.DefaultCurrencyCode,
                product.DisplayOrder,
                product.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductDto> CreateAsync(
        CreateProductRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = Product.Create(
            _tenant.CurrentCompanyId!.Value,
            request.ProductCategoryId,
            request.Code,
            request.Name,
            request.DisplayOrder,
            _clock.UtcNow,
            actorUserId,
            request.Description,
            request.CoverageTermsJson,
            request.DefaultCurrencyCode);

        _db.Products.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("Product was created but could not be reloaded.");
    }

    public async Task<ProductDto> UpdateAsync(
        int id, UpdateProductRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Product {id} not found");

        entity.Update(
            request.ProductCategoryId,
            request.Name,
            request.DisplayOrder,
            request.IsActive,
            actorUserId,
            _clock.UtcNow,
            request.Description,
            request.CoverageTermsJson,
            request.DefaultCurrencyCode);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("Product was updated but could not be reloaded.");
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Product {id} not found");

        entity.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
