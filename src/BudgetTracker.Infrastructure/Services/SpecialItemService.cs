using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.SpecialItems;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class SpecialItemService : ISpecialItemService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public SpecialItemService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<SpecialItemDto>> GetByVersionAsync(
        int budgetYearId, int? versionId, CancellationToken cancellationToken)
    {
        var query = _db.SpecialItems
            .Where(s => s.BudgetYearId == budgetYearId);

        if (versionId.HasValue)
        {
            query = query.Where(s => s.VersionId == versionId.Value);
        }

        return await query
            .Select(s => new SpecialItemDto(
                s.Id, s.VersionId, s.BudgetYearId,
                s.ItemType.ToString().ToUpperInvariant(),
                s.Month, s.Amount, s.CurrencyCode, s.Notes))
            .ToListAsync(cancellationToken);
    }

    public async Task<SpecialItemDto> CreateAsync(
        int budgetYearId,
        int? versionId,
        CreateSpecialItemRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (versionId.HasValue)
        {
            await EnsureEditableVersionAsync(versionId.Value, cancellationToken);
        }

        var itemType = ParseItemType(request.ItemType);

        var item = SpecialItem.Create(
            _tenant.CurrentCompanyId!.Value,
            versionId,
            budgetYearId,
            itemType,
            request.Amount,
            request.CurrencyCode,
            actorUserId,
            _clock.UtcNow,
            request.Month,
            request.Notes);

        _db.SpecialItems.Add(item);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(item);
    }

    public async Task DeleteAsync(int itemId, int actorUserId, CancellationToken cancellationToken)
    {
        var item = await _db.SpecialItems
            .FirstOrDefaultAsync(s => s.Id == itemId, cancellationToken)
            ?? throw new InvalidOperationException($"Special item {itemId} not found");

        if (item.VersionId.HasValue)
        {
            await EnsureEditableVersionAsync(item.VersionId.Value, cancellationToken);
        }

        item.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureEditableVersionAsync(int versionId, CancellationToken cancellationToken)
    {
        var status = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => v.Status)
            .FirstOrDefaultAsync(cancellationToken);

        if (status is not (BudgetVersionStatus.Draft or BudgetVersionStatus.Rejected))
        {
            throw new InvalidOperationException(
                $"Budget version {versionId} is {status} and cannot be edited");
        }
    }

    private static SpecialItemType ParseItemType(string itemType) =>
        itemType.ToUpperInvariant() switch
        {
            "MUALLAKHASAR" => SpecialItemType.MuallakHasar,
            "DEMOFILO" => SpecialItemType.DemoFilo,
            "FINANSALGELIR" => SpecialItemType.FinansalGelir,
            "TKATILIM" => SpecialItemType.TKatilim,
            "AMORTISMAN" => SpecialItemType.Amortisman,
            _ => throw new ArgumentException($"Invalid special item type: {itemType}")
        };

    private static SpecialItemDto ToDto(SpecialItem s) =>
        new(s.Id, s.VersionId, s.BudgetYearId,
            s.ItemType.ToString().ToUpperInvariant(),
            s.Month, s.Amount, s.CurrencyCode, s.Notes);
}
