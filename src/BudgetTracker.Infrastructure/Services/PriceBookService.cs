using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.PriceBooks;
using BudgetTracker.Application.Pricing;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.PriceBooks;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// PriceBook sürüm yaşam döngüsü (00b §3.2). Onay akışı: Draft → Active.
/// Onay sırasında aynı sözleşmenin önceki Active sürümü Archived'a taşınır
/// (EXCLUDE USING gist constraint DB seviyesinde çakışmaları engeller).
/// </summary>
public sealed class PriceBookService : IPriceBookService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;
    private readonly IPricingLookupService _lookupCache;

    public PriceBookService(
        IApplicationDbContext db,
        ITenantContext tenant,
        IClock clock,
        IAuditLogger audit,
        IPricingLookupService lookupCache)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
        _audit = audit;
        _lookupCache = lookupCache;
    }

    public async Task<IReadOnlyList<PriceBookDto>> GetByContractAsync(
        int contractId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts
            .FirstOrDefaultAsync(c => c.Id == contractId, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {contractId} not found");

        var rows = await _db.PriceBooks
            .Where(pb => pb.ContractId == contractId)
            .OrderByDescending(pb => pb.VersionNo)
            .Select(pb => new
            {
                pb,
                ItemCount = _db.PriceBookItems.Count(i => i.PriceBookId == pb.Id)
            })
            .ToListAsync(cancellationToken);

        return rows.Select(r => MapHeader(r.pb, contract.ContractCode, r.ItemCount)).ToList();
    }

    public async Task<PriceBookDetailDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var pb = await _db.PriceBooks
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (pb is null) return null;

        var contractCode = await _db.Contracts
            .Where(c => c.Id == pb.ContractId)
            .Select(c => c.ContractCode)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        var header = MapHeader(pb, contractCode, pb.Items.Count);
        var items = pb.Items.OrderBy(i => i.ProductCode).Select(MapItem).ToList();
        return new PriceBookDetailDto(header, items);
    }

    public async Task<PriceBookDto> CreateDraftAsync(
        int contractId,
        CreatePriceBookRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        var now = _clock.UtcNow;

        var contract = await _db.Contracts
            .FirstOrDefaultAsync(c => c.Id == contractId, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {contractId} not found");

        var nextVersion = (await _db.PriceBooks
            .Where(pb => pb.ContractId == contractId)
            .Select(pb => (int?)pb.VersionNo)
            .MaxAsync(cancellationToken) ?? 0) + 1;

        var draft = PriceBook.Create(
            companyId, contractId, nextVersion,
            request.EffectiveFrom, request.EffectiveTo,
            now, actorUserId, request.Notes);

        if (request.CopyFromPreviousActive)
        {
            var previousActive = await _db.PriceBooks
                .Include(p => p.Items)
                .Where(p => p.ContractId == contractId && p.Status == PriceBookStatus.Active)
                .FirstOrDefaultAsync(cancellationToken);
            if (previousActive is not null)
            {
                foreach (var src in previousActive.Items)
                {
                    draft.AddItem(PriceBookItem.Create(
                        0, src.ProductCode, src.ProductName, src.ItemType, src.Unit,
                        src.UnitPrice, src.CurrencyCode, now, actorUserId,
                        src.TaxRate, src.MinQuantity, src.Notes));
                }
            }
        }

        _db.PriceBooks.Add(draft);
        await _db.SaveChangesAsync(cancellationToken);

        await _audit.LogAsync(new AuditEvent(
            AuditEntityNames.PriceBook,
            draft.Id.ToString(),
            AuditActions.PriceBookVersionCreated,
            CompanyId: companyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new
            {
                draft.Id,
                draft.ContractId,
                draft.VersionNo,
                EffectiveFrom = draft.EffectiveFrom.ToString("yyyy-MM-dd"),
                EffectiveTo = draft.EffectiveTo?.ToString("yyyy-MM-dd"),
                ItemCount = draft.Items.Count
            })), cancellationToken);

        return MapHeader(draft, contract.ContractCode, draft.Items.Count);
    }

    public async Task<IReadOnlyList<PriceBookItemDto>> BulkAddItemsAsync(
        int priceBookId,
        BulkAddItemsRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        var now = _clock.UtcNow;

        var pb = await _db.PriceBooks
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == priceBookId, cancellationToken)
            ?? throw new InvalidOperationException($"PriceBook {priceBookId} not found");

        if (pb.Status != PriceBookStatus.Draft)
        {
            throw new InvalidOperationException(
                $"bulk add allowed only on Draft PriceBook (current: {pb.Status}).");
        }

        var existingCount = pb.Items.Count;
        if (request.ReplaceExisting && existingCount > 0)
        {
            _db.PriceBookItems.RemoveRange(pb.Items);
            pb.ClearItems(); // navigation cache senkron — AddItem dedup temiz başlasın
        }

        foreach (var input in request.Items)
        {
            var item = PriceBookItem.Create(
                pb.Id,
                input.ProductCode,
                input.ProductName,
                ParseEnum<PriceBookItemType>(input.ItemType, nameof(input.ItemType)),
                input.Unit,
                input.UnitPrice,
                string.IsNullOrWhiteSpace(input.CurrencyCode) ? "TRY" : input.CurrencyCode,
                now,
                actorUserId,
                input.TaxRate,
                input.MinQuantity,
                input.Notes);
            pb.AddItem(item);
        }

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.LogAsync(new AuditEvent(
            AuditEntityNames.PriceBook,
            pb.Id.ToString(),
            AuditActions.PriceBookItemsChanged,
            CompanyId: companyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new
            {
                pb.Id,
                ReplacedCount = request.ReplaceExisting ? existingCount : 0,
                AddedCount = request.Items.Count
            })), cancellationToken);

        return pb.Items.OrderBy(i => i.ProductCode).Select(MapItem).ToList();
    }

    public async Task<PriceBookDto> ApproveAsync(
        int priceBookId, int actorUserId, CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        var now = _clock.UtcNow;

        var pb = await _db.PriceBooks
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == priceBookId, cancellationToken)
            ?? throw new InvalidOperationException($"PriceBook {priceBookId} not found");

        var contract = await _db.Contracts
            .FirstOrDefaultAsync(c => c.Id == pb.ContractId, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {pb.ContractId} not found");

        // Önce eski Active sürümü archive et, sonra yeni sürümü Active yap.
        // Aynı transaction içinde yapılırsa EXCLUDE USING gist constraint
        // deferred olmadığı için sıra önemli.
        var previousActive = await _db.PriceBooks
            .Where(p => p.ContractId == pb.ContractId
                && p.Status == PriceBookStatus.Active
                && p.Id != pb.Id)
            .ToListAsync(cancellationToken);
        var archiveOn = pb.EffectiveFrom.AddDays(-1);
        foreach (var prev in previousActive)
        {
            prev.Archive(actorUserId, now, archiveOn);
        }
        if (previousActive.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        pb.Approve(actorUserId, now);
        await _db.SaveChangesAsync(cancellationToken);

        // Onay sonrası lookup cache'i bu contract için sıfırla — yeni fiyatlar
        // anında aktif; arşivlenen eski sürüm tarih kesimine kadar kullanılır.
        _lookupCache.InvalidateForContract(pb.ContractId);

        await _audit.LogAsync(new AuditEvent(
            AuditEntityNames.PriceBook,
            pb.Id.ToString(),
            AuditActions.PriceBookApproved,
            CompanyId: companyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new
            {
                pb.Id,
                pb.ContractId,
                pb.VersionNo,
                ItemCount = pb.Items.Count,
                PreviousArchivedIds = previousActive.Select(p => p.Id).ToArray()
            })), cancellationToken);

        return MapHeader(pb, contract.ContractCode, pb.Items.Count);
    }

    public async Task<IReadOnlyList<PriceBookItemDto>> GetItemsAsync(
        int priceBookId, string? productCode, CancellationToken cancellationToken)
    {
        var query = _db.PriceBookItems.Where(i => i.PriceBookId == priceBookId);
        if (!string.IsNullOrWhiteSpace(productCode))
        {
            var normalized = productCode.Trim();
            query = query.Where(i => i.ProductCode == normalized);
        }
        var items = await query.OrderBy(i => i.ProductCode).ToListAsync(cancellationToken);
        return items.Select(MapItem).ToList();
    }

    private static PriceBookDto MapHeader(PriceBook pb, string contractCode, int itemCount) => new(
        pb.Id, pb.ContractId, contractCode, pb.VersionNo,
        pb.EffectiveFrom, pb.EffectiveTo, pb.Status.ToString(), pb.Notes,
        pb.ApprovedByUserId, pb.ApprovedAt, itemCount,
        pb.CreatedAt, pb.CreatedByUserId, pb.UpdatedAt);

    private static PriceBookItemDto MapItem(PriceBookItem i) => new(
        i.Id, i.PriceBookId, i.ProductCode, i.ProductName,
        i.ItemType.ToString(), i.Unit, i.UnitPrice, i.CurrencyCode,
        i.TaxRate, i.MinQuantity, i.Notes);

    private static T ParseEnum<T>(string value, string paramName) where T : struct, Enum
    {
        if (Enum.TryParse<T>(value, ignoreCase: true, out var result))
        {
            return result;
        }
        throw new ArgumentException($"Invalid {typeof(T).Name} value: '{value}'", paramName);
    }
}
