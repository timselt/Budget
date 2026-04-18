using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Segments;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class SegmentService : ISegmentService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public SegmentService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<SegmentDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _db.Segments
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .Select(s => new SegmentDto(s.Id, s.Code, s.Name, s.DisplayOrder, s.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<SegmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Segments
            .Where(s => s.Id == id)
            .Select(s => new SegmentDto(s.Id, s.Code, s.Name, s.DisplayOrder, s.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<SegmentDto> CreateAsync(
        CreateSegmentRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = Segment.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Code,
            request.Name,
            request.DisplayOrder,
            _clock.UtcNow,
            actorUserId);

        _db.Segments.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return new SegmentDto(entity.Id, entity.Code, entity.Name, entity.DisplayOrder, entity.IsActive);
    }

    public async Task<SegmentDto> UpdateAsync(
        int id, UpdateSegmentRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.Segments.FirstOrDefaultAsync(s => s.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Segment {id} not found");

        entity.Update(request.Name, request.DisplayOrder, request.IsActive, actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return new SegmentDto(entity.Id, entity.Code, entity.Name, entity.DisplayOrder, entity.IsActive);
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var entity = await _db.Segments.FirstOrDefaultAsync(s => s.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Segment {id} not found");

        entity.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
