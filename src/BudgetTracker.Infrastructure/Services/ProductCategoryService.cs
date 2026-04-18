using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Products;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class ProductCategoryService : IProductCategoryService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public ProductCategoryService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ProductCategoryDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await (
            from category in _db.ProductCategories
            from segment in _db.Segments.Where(s => s.Id == category.SegmentId).DefaultIfEmpty()
            orderby category.DisplayOrder, category.Name
            select new ProductCategoryDto(
                category.Id,
                category.Code,
                category.Name,
                category.Description,
                category.DisplayOrder,
                category.SegmentId,
                segment != null ? segment.Name : null,
                category.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductCategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await (
            from category in _db.ProductCategories
            from segment in _db.Segments.Where(s => s.Id == category.SegmentId).DefaultIfEmpty()
            where category.Id == id
            select new ProductCategoryDto(
                category.Id,
                category.Code,
                category.Name,
                category.Description,
                category.DisplayOrder,
                category.SegmentId,
                segment != null ? segment.Name : null,
                category.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductCategoryDto> CreateAsync(
        CreateProductCategoryRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = ProductCategory.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Code,
            request.Name,
            request.DisplayOrder,
            _clock.UtcNow,
            actorUserId,
            request.Description,
            request.SegmentId);

        _db.ProductCategories.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("ProductCategory was created but could not be reloaded.");
    }

    public async Task<ProductCategoryDto> UpdateAsync(
        int id, UpdateProductCategoryRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductCategories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"ProductCategory {id} not found");

        entity.Update(
            request.Name,
            request.DisplayOrder,
            request.IsActive,
            actorUserId,
            _clock.UtcNow,
            request.Description,
            request.SegmentId);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken)
            ?? throw new InvalidOperationException("ProductCategory was updated but could not be reloaded.");
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.ProductCategories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"ProductCategory {id} not found");

        entity.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
