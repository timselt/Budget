using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class Customer : TenantEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string? CategoryCode { get; private set; }
    public string? SubCategory { get; private set; }
    public string? TaxId { get; private set; }
    public string? TaxOffice { get; private set; }
    public int SegmentId { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public bool IsGroupInternal { get; private set; }
    public string? AccountManager { get; private set; }
    public string? DefaultCurrencyCode { get; private set; }
    public string? SourceSheet { get; private set; }
    public string? Notes { get; private set; }
    public string? AccountNo { get; private set; }
    public string? FullTitle { get; private set; }
    public bool IsActive { get; private set; }

    /// <summary>
    /// Excel "Diğer" alt-kırılım göstergesi (bkz. docs/reference/butce_schema_v1.sql §2.3
    /// `is_other_flag`). Bir müşteri segment içinde kendi satırı yerine "Diğer" toplam
    /// satırına dahil ediliyorsa true. Excel import sırasında set edilir.
    /// </summary>
    public bool IsOtherFlag { get; private set; }

    private Customer() { }

    public static Customer Create(
        int companyId,
        string code,
        string name,
        int segmentId,
        int createdByUserId,
        DateTimeOffset createdAt,
        string? categoryCode = null,
        string? subCategory = null,
        string? taxId = null,
        string? taxOffice = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        bool isGroupInternal = false,
        string? accountManager = null,
        string? defaultCurrencyCode = null,
        string? sourceSheet = null,
        string? notes = null,
        bool isOtherFlag = false)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (code.Length > 30) throw new ArgumentException("code max 30 characters", nameof(code));
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));

        return new Customer
        {
            CompanyId = companyId,
            Code = code,
            Name = name,
            CategoryCode = Normalize(categoryCode),
            SubCategory = Normalize(subCategory),
            TaxId = Normalize(taxId),
            TaxOffice = Normalize(taxOffice),
            SegmentId = segmentId,
            StartDate = startDate,
            EndDate = endDate,
            IsGroupInternal = isGroupInternal,
            AccountManager = Normalize(accountManager),
            DefaultCurrencyCode = NormalizeCurrencyCode(defaultCurrencyCode),
            SourceSheet = sourceSheet,
            Notes = notes,
            IsActive = true,
            IsOtherFlag = isOtherFlag,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void Update(
        string name,
        int segmentId,
        string? categoryCode,
        string? subCategory,
        string? taxId,
        string? taxOffice,
        DateOnly? startDate,
        DateOnly? endDate,
        bool isGroupInternal,
        string? accountManager,
        string? defaultCurrencyCode,
        string? notes,
        bool isActive,
        int actorUserId,
        DateTimeOffset updatedAt,
        bool? isOtherFlag = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Length > 200) throw new ArgumentException("name max 200 characters", nameof(name));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));

        Name = name;
        SegmentId = segmentId;
        CategoryCode = Normalize(categoryCode);
        SubCategory = Normalize(subCategory);
        TaxId = Normalize(taxId);
        TaxOffice = Normalize(taxOffice);
        StartDate = startDate;
        EndDate = endDate;
        IsGroupInternal = isGroupInternal;
        AccountManager = Normalize(accountManager);
        DefaultCurrencyCode = NormalizeCurrencyCode(defaultCurrencyCode);
        Notes = notes;
        IsActive = isActive;
        if (isOtherFlag.HasValue) IsOtherFlag = isOtherFlag.Value;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeCurrencyCode(string? value)
    {
        var normalized = Normalize(value);
        if (normalized is null)
        {
            return null;
        }

        if (normalized.Length != 3)
        {
            throw new ArgumentException("currency code must be 3 characters", nameof(value));
        }

        return normalized.ToUpperInvariant();
    }
}
