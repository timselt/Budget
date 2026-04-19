using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.PriceBooks;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// Bir <see cref="Contract"/>'a ait versiyonlu fiyat listesi (00b §2.1).
/// Aynı sözleşme için aynı anda tek <see cref="PriceBookStatus.Active"/>
/// sürüm olabilir; bu DB seviyesinde EXCLUDE USING gist ile garanti edilir.
/// Sürüm kopyalama (yeni Draft'a başlangıç) servis katmanında yapılır.
/// </summary>
public sealed class PriceBook : TenantEntity
{
    private readonly List<PriceBookItem> _items = new();

    public int ContractId { get; private set; }
    public int VersionNo { get; private set; }
    public DateOnly EffectiveFrom { get; private set; }
    public DateOnly? EffectiveTo { get; private set; }
    public PriceBookStatus Status { get; private set; }
    public string? Notes { get; private set; }

    public int? ApprovedByUserId { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }

    public IReadOnlyCollection<PriceBookItem> Items => _items;

    private PriceBook() { }

    public static PriceBook Create(
        int companyId,
        int contractId,
        int versionNo,
        DateOnly effectiveFrom,
        DateOnly? effectiveTo,
        DateTimeOffset createdAt,
        int? createdByUserId,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (contractId <= 0) throw new ArgumentOutOfRangeException(nameof(contractId));
        if (versionNo <= 0) throw new ArgumentOutOfRangeException(nameof(versionNo));
        if (effectiveTo is not null && effectiveTo.Value < effectiveFrom)
            throw new ArgumentException("effective_to cannot precede effective_from");

        var pb = new PriceBook
        {
            ContractId = contractId,
            VersionNo = versionNo,
            EffectiveFrom = effectiveFrom,
            EffectiveTo = effectiveTo,
            Status = PriceBookStatus.Draft,
            Notes = notes,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        pb.CompanyId = companyId;
        return pb;
    }

    public void AddItem(PriceBookItem item)
    {
        RequireDraft();
        ArgumentNullException.ThrowIfNull(item);
        if (_items.Any(i => string.Equals(i.ProductCode, item.ProductCode, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException(
                $"duplicate product_code '{item.ProductCode}' in this PriceBook");
        }
        _items.Add(item);
    }

    public void RemoveItem(int itemId)
    {
        RequireDraft();
        var existing = _items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new InvalidOperationException($"item {itemId} not in this PriceBook");
        _items.Remove(existing);
    }

    /// <summary>Draft içindeki tüm item'ları temizler (bulk replace senaryosu).</summary>
    public void ClearItems()
    {
        RequireDraft();
        _items.Clear();
    }

    /// <summary>Draft → Active. Onay zamanı ve kullanıcısı kaydedilir.</summary>
    public void Approve(int approverUserId, DateTimeOffset approvedAt)
    {
        if (Status != PriceBookStatus.Draft)
        {
            throw new InvalidOperationException(
                $"only Draft PriceBook can be approved (current: {Status}).");
        }
        if (_items.Count == 0)
        {
            throw new InvalidOperationException("cannot approve an empty PriceBook.");
        }
        Status = PriceBookStatus.Active;
        ApprovedByUserId = approverUserId;
        ApprovedAt = approvedAt;
        UpdatedAt = approvedAt;
        UpdatedByUserId = approverUserId;
    }

    /// <summary>Active → Archived (yeni sürüm onaylandığında servis tarafından çağrılır).</summary>
    public void Archive(int actorUserId, DateTimeOffset updatedAt, DateOnly archiveOn)
    {
        if (Status != PriceBookStatus.Active) return;
        Status = PriceBookStatus.Archived;
        if (EffectiveTo is null || EffectiveTo.Value > archiveOn)
        {
            EffectiveTo = archiveOn;
        }
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>Draft güncellemesi — notlar ve tarih pencere değişiklikleri.</summary>
    public void UpdateDraft(
        DateOnly effectiveFrom,
        DateOnly? effectiveTo,
        string? notes,
        int actorUserId,
        DateTimeOffset updatedAt)
    {
        RequireDraft();
        if (effectiveTo is not null && effectiveTo.Value < effectiveFrom)
            throw new ArgumentException("effective_to cannot precede effective_from");
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private void RequireDraft()
    {
        if (Status != PriceBookStatus.Draft)
        {
            throw new InvalidOperationException(
                $"mutation allowed only on Draft PriceBook (current: {Status}).");
        }
    }
}
