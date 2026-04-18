using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// Ürün kategorisi (ör. Yol Yardım, İkame Araç, Konut Asistans). Müşteri
/// kategorisi (<see cref="Segment"/>) ile opsiyonel bağ — bazı ürün kategorileri
/// sadece belirli segmentlerde anlamlı (örn. "İkame Araç" Filo/Otomotiv için).
/// <see cref="Product"/> bu kategorinin altındaki teminat-bazlı varyantları tutar.
/// Bkz. ADR-0013.
/// </summary>
public sealed class ProductCategory : TenantEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public int DisplayOrder { get; private set; }
    public int? SegmentId { get; private set; }
    public bool IsActive { get; private set; }

    private ProductCategory() { }

    public static ProductCategory Create(
        int companyId,
        string code,
        string name,
        int displayOrder,
        DateTimeOffset createdAt,
        int? createdByUserId = null,
        string? description = null,
        int? segmentId = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (code.Length > 30) throw new ArgumentException("code max 30 characters", nameof(code));
        if (name.Length > 150) throw new ArgumentException("name max 150 characters", nameof(name));
        if (segmentId is <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));

        var entity = new ProductCategory
        {
            Code = code,
            Name = name,
            Description = description,
            DisplayOrder = displayOrder,
            SegmentId = segmentId,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }

    public void Update(
        string name,
        int displayOrder,
        bool isActive,
        int actorUserId,
        DateTimeOffset updatedAt,
        string? description = null,
        int? segmentId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Length > 150) throw new ArgumentException("name max 150 characters", nameof(name));
        if (segmentId is <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));

        Name = name;
        Description = description;
        DisplayOrder = displayOrder;
        SegmentId = segmentId;
        IsActive = isActive;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
