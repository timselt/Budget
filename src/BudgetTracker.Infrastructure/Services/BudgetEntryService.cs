using BudgetTracker.Application.BudgetEntries;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class BudgetEntryService : IBudgetEntryService
{
    private readonly IApplicationDbContext _db;
    private readonly IFxConversionService _fx;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public BudgetEntryService(
        IApplicationDbContext db,
        IFxConversionService fx,
        ITenantContext tenant,
        IClock clock)
    {
        _db = db;
        _fx = fx;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<BudgetEntryDto>> GetByVersionAsync(
        int versionId, CancellationToken cancellationToken)
    {
        return await _db.BudgetEntries
            .Where(e => e.VersionId == versionId)
            .Select(e => new BudgetEntryDto(
                e.Id, e.VersionId, e.CustomerId, null,
                e.Month, e.EntryType.ToString().ToUpperInvariant(),
                e.AmountOriginal, e.CurrencyCode,
                e.AmountTryFixed, e.AmountTrySpot,
                e.ContractId, e.ProductId, e.Quantity))
            .ToListAsync(cancellationToken);
    }

    public async Task<BudgetEntryDto> CreateAsync(
        int versionId,
        CreateBudgetEntryRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await GetEditableVersionAsync(versionId, cancellationToken);
        var entryType = ParseEntryType(request.EntryType);

        var fxResult = await _fx.ConvertToTryAsync(
            request.AmountOriginal, request.CurrencyCode,
            version.BudgetYear, request.Month, cancellationToken);

        var entry = BudgetEntry.Create(
            _tenant.CurrentCompanyId!.Value,
            versionId,
            request.CustomerId,
            request.Month,
            entryType,
            request.AmountOriginal,
            request.CurrencyCode,
            fxResult.AmountTryFixed,
            fxResult.AmountTrySpot,
            actorUserId,
            _clock.UtcNow);

        _db.BudgetEntries.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(entry);
    }

    public async Task<IReadOnlyList<BudgetEntryDto>> BulkUpsertAsync(
        int versionId,
        BulkUpdateBudgetEntriesRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var version = await GetEditableVersionAsync(versionId, cancellationToken);
        var now = _clock.UtcNow;
        var companyId = _tenant.CurrentCompanyId!.Value;
        var tracked = new List<BudgetEntry>(request.Entries.Count);

        foreach (var upsert in request.Entries)
        {
            var entryType = ParseEntryType(upsert.EntryType);

            var fxResult = await _fx.ConvertToTryAsync(
                upsert.AmountOriginal, upsert.CurrencyCode,
                version.BudgetYear, upsert.Month, cancellationToken);

            if (upsert.Id.HasValue)
            {
                var existing = await _db.BudgetEntries
                    .FirstOrDefaultAsync(e => e.Id == upsert.Id.Value && e.VersionId == versionId,
                        cancellationToken)
                    ?? throw new InvalidOperationException($"Budget entry {upsert.Id} not found");

                existing.UpdateAmount(
                    upsert.AmountOriginal, upsert.CurrencyCode,
                    fxResult.AmountTryFixed, fxResult.AmountTrySpot,
                    actorUserId, now,
                    quantity: upsert.Quantity);

                tracked.Add(existing);
            }
            else
            {
                var entry = BudgetEntry.Create(
                    companyId, versionId, upsert.CustomerId, upsert.Month,
                    entryType, upsert.AmountOriginal, upsert.CurrencyCode,
                    fxResult.AmountTryFixed, fxResult.AmountTrySpot,
                    actorUserId, now,
                    productId: upsert.ProductId,
                    quantity: upsert.Quantity,
                    contractId: upsert.ContractId);

                _db.BudgetEntries.Add(entry);
                tracked.Add(entry);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return tracked.Select(ToDto).ToList();
    }

    public async Task DeleteAsync(
        int versionId, int entryId, int actorUserId, CancellationToken cancellationToken)
    {
        await GetEditableVersionAsync(versionId, cancellationToken);

        var entry = await _db.BudgetEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.VersionId == versionId, cancellationToken)
            ?? throw new InvalidOperationException($"Budget entry {entryId} not found");

        entry.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<VersionInfo> GetEditableVersionAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => new VersionInfo(v.Status, v.BudgetYearId))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"Budget version {versionId} not found");

        if (version.Status is not (BudgetVersionStatus.Draft or BudgetVersionStatus.Rejected))
        {
            throw new InvalidOperationException(
                $"Budget version {versionId} is {version.Status} and cannot be edited");
        }

        var budgetYear = await _db.BudgetYears
            .Where(y => y.Id == version.BudgetYearId)
            .Select(y => y.Year)
            .FirstOrDefaultAsync(cancellationToken);

        return version with { BudgetYear = budgetYear };
    }

    private static EntryType ParseEntryType(string entryType) =>
        entryType.ToUpperInvariant() switch
        {
            "REVENUE" => EntryType.Revenue,
            "CLAIM" => EntryType.Claim,
            _ => throw new ArgumentException($"Invalid entry type: {entryType}")
        };

    private static BudgetEntryDto ToDto(BudgetEntry e) =>
        new(e.Id, e.VersionId, e.CustomerId, null,
            e.Month, e.EntryType.ToString().ToUpperInvariant(),
            e.AmountOriginal, e.CurrencyCode,
            e.AmountTryFixed, e.AmountTrySpot,
            ContractId: e.ContractId,
            ProductId: e.ProductId,
            Quantity: e.Quantity);

    private sealed record VersionInfo(BudgetVersionStatus Status, int BudgetYearId)
    {
        public int BudgetYear { get; init; }
    }
}
