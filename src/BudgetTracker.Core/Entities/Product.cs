using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// Ürün (ör. "Yol Yardım — LifeStyle Koruma", "İkame Araç — 5x3 gün"). Bir
/// <see cref="ProductCategory"/> altında teminat parametreleriyle ayrışan
/// varyantları temsil eder. <see cref="CoverageTermsJson"/> esnek JSONB —
/// gün/limit/sefer sayısı gibi parametreler (uygulama katmanında valide edilir).
/// Bir müşteride kullanılıp kullanılmadığı <see cref="CustomerProduct"/> ile
/// tanımlanır. Bkz. ADR-0013.
/// </summary>
public sealed class Product : TenantEntity
{
    public int ProductCategoryId { get; private set; }
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? CoverageTermsJson { get; private set; }
    public string? DefaultCurrencyCode { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    private Product() { }

    public static Product Create(
        int companyId,
        int productCategoryId,
        string code,
        string name,
        int displayOrder,
        DateTimeOffset createdAt,
        int? createdByUserId = null,
        string? description = null,
        string? coverageTermsJson = null,
        string? defaultCurrencyCode = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (productCategoryId <= 0) throw new ArgumentOutOfRangeException(nameof(productCategoryId));
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (code.Length > 30) throw new ArgumentException("code max 30 characters", nameof(code));
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));

        var currency = NormalizeCurrencyCode(defaultCurrencyCode);

        var entity = new Product
        {
            ProductCategoryId = productCategoryId,
            Code = code,
            Name = name,
            Description = description,
            CoverageTermsJson = coverageTermsJson,
            DefaultCurrencyCode = currency,
            DisplayOrder = displayOrder,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }

    public void Update(
        int productCategoryId,
        string name,
        int displayOrder,
        bool isActive,
        int actorUserId,
        DateTimeOffset updatedAt,
        string? description = null,
        string? coverageTermsJson = null,
        string? defaultCurrencyCode = null)
    {
        if (productCategoryId <= 0) throw new ArgumentOutOfRangeException(nameof(productCategoryId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));

        var currency = NormalizeCurrencyCode(defaultCurrencyCode);

        ProductCategoryId = productCategoryId;
        Name = name;
        Description = description;
        CoverageTermsJson = coverageTermsJson;
        DefaultCurrencyCode = currency;
        DisplayOrder = displayOrder;
        IsActive = isActive;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private static string? NormalizeCurrencyCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length != 3)
        {
            throw new ArgumentException("currency code must be 3 characters", nameof(value));
        }

        return trimmed.ToUpperInvariant();
    }
}
