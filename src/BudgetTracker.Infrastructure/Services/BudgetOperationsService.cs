using BudgetTracker.Application.BudgetOperations;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// Geçen-yıl kopyala + %X büyüt hızlı işlemlerinin domain tarafı.
/// BudgetEntry state makinesine dokunmaz — sadece satırları mutate eder ve
/// FX'i yeniden hesaplar.
/// </summary>
public sealed class BudgetOperationsService : IBudgetOperationsService
{
    private const decimal MinGrowPercent = -99m;
    private const decimal MaxGrowPercent = 200m;

    private readonly IApplicationDbContext _db;
    private readonly IFxConversionService _fx;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public BudgetOperationsService(
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

    public async Task<CopyResultDto> CopyFromYearAsync(
        int targetVersionId,
        CopyFromYearRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var target = await GetEditableVersionAsync(targetVersionId, cancellationToken);

        // Kaynak yılının ACTIVE versiyonunu bul
        var sourceVersionId = await _db.BudgetVersions
            .Where(v => v.BudgetYearId == request.SourceBudgetYearId
                        && v.Status == BudgetVersionStatus.Active)
            .Select(v => (int?)v.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                $"Budget year {request.SourceBudgetYearId} has no ACTIVE version to copy from");

        if (sourceVersionId == targetVersionId)
        {
            throw new InvalidOperationException("Source and target versions cannot be the same");
        }

        var sourceQuery = _db.BudgetEntries.Where(e => e.VersionId == sourceVersionId);
        if (request.CustomerId.HasValue)
        {
            sourceQuery = sourceQuery.Where(e => e.CustomerId == request.CustomerId.Value);
        }
        if (request.ProductId.HasValue)
        {
            sourceQuery = sourceQuery.Where(e => e.ProductId == request.ProductId.Value);
        }

        var sourceRows = await sourceQuery.ToListAsync(cancellationToken);

        // Hedef version'daki overlapping (customer×product×month×type) satırları bul
        var targetQuery = _db.BudgetEntries.Where(e => e.VersionId == targetVersionId);
        if (request.CustomerId.HasValue)
        {
            targetQuery = targetQuery.Where(e => e.CustomerId == request.CustomerId.Value);
        }
        if (request.ProductId.HasValue)
        {
            targetQuery = targetQuery.Where(e => e.ProductId == request.ProductId.Value);
        }
        var targetRows = await targetQuery.ToListAsync(cancellationToken);

        var existingByKey = targetRows.ToDictionary(
            e => new EntryKey(e.CustomerId, e.ProductId, e.Month, e.EntryType),
            e => e);

        var now = _clock.UtcNow;
        var companyId = _tenant.CurrentCompanyId!.Value;
        int copied = 0;
        int overwritten = 0;

        foreach (var src in sourceRows)
        {
            // FX'i hedef yıla göre yeniden hesapla (eski yıl kuru geçersiz)
            var fxResult = await _fx.ConvertToTryAsync(
                src.AmountOriginal, src.CurrencyCode,
                target.BudgetYear, src.Month, cancellationToken);

            var key = new EntryKey(src.CustomerId, src.ProductId, src.Month, src.EntryType);
            if (existingByKey.TryGetValue(key, out var existing))
            {
                existing.UpdateAmount(
                    src.AmountOriginal, src.CurrencyCode,
                    fxResult.AmountTryFixed, fxResult.AmountTrySpot,
                    actorUserId, now);
                overwritten++;
            }
            else
            {
                var entry = BudgetEntry.Create(
                    companyId, targetVersionId, src.CustomerId, src.Month,
                    src.EntryType, src.AmountOriginal, src.CurrencyCode,
                    fxResult.AmountTryFixed, fxResult.AmountTrySpot,
                    actorUserId, now, notes: src.Notes,
                    productId: src.ProductId, quantity: src.Quantity);
                _db.BudgetEntries.Add(entry);
                copied++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        var (revenueTotal, claimTotal) = await SumByTypeAsync(
            targetVersionId, request.CustomerId, request.ProductId, cancellationToken);

        return new CopyResultDto(copied, overwritten, revenueTotal, claimTotal);
    }

    public async Task<GrowResultDto> GrowByPercentAsync(
        int targetVersionId,
        GrowByPercentRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (request.Percent < MinGrowPercent || request.Percent > MaxGrowPercent)
        {
            throw new ArgumentOutOfRangeException(
                nameof(request),
                $"percent must be between {MinGrowPercent} and {MaxGrowPercent}");
        }

        var target = await GetEditableVersionAsync(targetVersionId, cancellationToken);

        var query = _db.BudgetEntries.Where(e => e.VersionId == targetVersionId);
        if (request.CustomerId.HasValue)
        {
            query = query.Where(e => e.CustomerId == request.CustomerId.Value);
        }
        if (request.ProductId.HasValue)
        {
            query = query.Where(e => e.ProductId == request.ProductId.Value);
        }

        var rows = await query.ToListAsync(cancellationToken);
        var multiplier = 1m + (request.Percent / 100m);
        var now = _clock.UtcNow;
        int updated = 0;

        foreach (var row in rows)
        {
            var newAmount = Math.Round(
                row.AmountOriginal * multiplier, 2, MidpointRounding.ToEven);

            var fxResult = await _fx.ConvertToTryAsync(
                newAmount, row.CurrencyCode,
                target.BudgetYear, row.Month, cancellationToken);

            row.UpdateAmount(
                newAmount, row.CurrencyCode,
                fxResult.AmountTryFixed, fxResult.AmountTrySpot,
                actorUserId, now,
                notes: row.Notes, quantity: row.Quantity);
            updated++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        var (revenueTotal, claimTotal) = await SumByTypeAsync(
            targetVersionId, request.CustomerId, request.ProductId, cancellationToken);

        return new GrowResultDto(updated, revenueTotal, claimTotal);
    }

    private async Task<(decimal Revenue, decimal Claim)> SumByTypeAsync(
        int versionId, int? customerId, int? productId, CancellationToken ct)
    {
        var query = _db.BudgetEntries.Where(e => e.VersionId == versionId);
        if (customerId.HasValue) query = query.Where(e => e.CustomerId == customerId.Value);
        if (productId.HasValue) query = query.Where(e => e.ProductId == productId.Value);

        var sums = await query
            .GroupBy(e => e.EntryType)
            .Select(g => new { g.Key, Total = g.Sum(x => x.AmountTryFixed) })
            .ToListAsync(ct);

        var revenue = sums.FirstOrDefault(s => s.Key == EntryType.Revenue)?.Total ?? 0m;
        var claim = sums.FirstOrDefault(s => s.Key == EntryType.Claim)?.Total ?? 0m;
        return (revenue, claim);
    }

    private async Task<VersionInfo> GetEditableVersionAsync(
        int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => new { v.Status, v.BudgetYearId })
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

        return new VersionInfo(version.Status, version.BudgetYearId, budgetYear);
    }

    private sealed record EntryKey(int CustomerId, int? ProductId, int Month, EntryType EntryType);
    private sealed record VersionInfo(BudgetVersionStatus Status, int BudgetYearId, int BudgetYear);
}
