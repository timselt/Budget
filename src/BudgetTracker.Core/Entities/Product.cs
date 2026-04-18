using System.Text.Json;
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
        ValidateCoverageTermsJson(coverageTermsJson);

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
        ValidateCoverageTermsJson(coverageTermsJson);

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

    /// <summary>
    /// Teminat parametrelerinin yapısal doğrulaması (ADR-0013 §3 karar 2026-04-18):
    /// CoverageTermsJson opsiyoneldir; dolu olduğunda
    ///   { "coverages": [ { "name": "...", "description": "...", ... }, ... ] }
    /// şemasına uymak zorundadır. Her teminat kaleminin `name` ve `description`
    /// alanları boş olmayan string olmalı; diğer alanlar (value/unit/limit vb.)
    /// serbest kullanım için açık bırakılmıştır.
    /// </summary>
    private static void ValidateCoverageTermsJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return;
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("coverageTermsJson must be valid JSON", nameof(json), ex);
        }

        using (doc)
        {
            if (doc.RootElement.ValueKind != JsonValueKind.Object ||
                !doc.RootElement.TryGetProperty("coverages", out var coverages) ||
                coverages.ValueKind != JsonValueKind.Array)
            {
                throw new ArgumentException(
                    "coverageTermsJson must contain a 'coverages' array", nameof(json));
            }

            var index = 0;
            foreach (var item in coverages.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                {
                    throw new ArgumentException(
                        $"coverage term at index {index} must be an object", nameof(json));
                }

                if (!item.TryGetProperty("name", out var nameEl) ||
                    nameEl.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(nameEl.GetString()))
                {
                    throw new ArgumentException(
                        $"coverage term at index {index} must have a non-empty 'name'", nameof(json));
                }

                if (!item.TryGetProperty("description", out var descEl) ||
                    descEl.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(descEl.GetString()))
                {
                    throw new ArgumentException(
                        $"coverage term at index {index} must have a non-empty 'description'",
                        nameof(json));
                }

                index++;
            }
        }
    }
}
