using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.ExpenseCategories;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class ExpenseCategoryService : IExpenseCategoryService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public ExpenseCategoryService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ExpenseCategoryDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _db.ExpenseCategories
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .Select(c => new ExpenseCategoryDto(c.Id, c.Code, c.Name, c.Classification, c.DisplayOrder, c.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ExpenseCategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.ExpenseCategories
            .Where(c => c.Id == id)
            .Select(c => new ExpenseCategoryDto(c.Id, c.Code, c.Name, c.Classification, c.DisplayOrder, c.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ExpenseCategoryDto> CreateAsync(
        CreateExpenseCategoryRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = ExpenseCategory.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Code,
            request.Name,
            request.Classification,
            request.DisplayOrder,
            _clock.UtcNow,
            actorUserId);

        _db.ExpenseCategories.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return new ExpenseCategoryDto(entity.Id, entity.Code, entity.Name, entity.Classification, entity.DisplayOrder, entity.IsActive);
    }

    public async Task<ExpenseCategoryDto> UpdateAsync(
        int id, UpdateExpenseCategoryRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"ExpenseCategory {id} not found");

        entity.Update(request.Name, request.Classification, request.DisplayOrder, request.IsActive, actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return new ExpenseCategoryDto(entity.Id, entity.Code, entity.Name, entity.Classification, entity.DisplayOrder, entity.IsActive);
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"ExpenseCategory {id} not found");

        entity.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
