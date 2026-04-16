using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class BudgetEntry : TenantEntity
{
    public int VersionId { get; private set; }
    public int CustomerId { get; private set; }
    public int Month { get; private set; }
    public EntryType EntryType { get; private set; }
    public decimal AmountOriginal { get; private set; }
    public string CurrencyCode { get; private set; } = default!;
    public decimal AmountTryFixed { get; private set; }
    public decimal AmountTrySpot { get; private set; }
    public string? Notes { get; private set; }

    private BudgetEntry() { }

    public static BudgetEntry Create(
        int companyId,
        int versionId,
        int customerId,
        int month,
        EntryType entryType,
        decimal amountOriginal,
        string currencyCode,
        decimal amountTryFixed,
        decimal amountTrySpot,
        int createdByUserId,
        DateTimeOffset createdAt,
        string? notes = null)
    {
        ValidateMonth(month);
        ValidateCurrencyCode(currencyCode);
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (versionId <= 0) throw new ArgumentOutOfRangeException(nameof(versionId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));

        return new BudgetEntry
        {
            CompanyId = companyId,
            VersionId = versionId,
            CustomerId = customerId,
            Month = month,
            EntryType = entryType,
            AmountOriginal = amountOriginal,
            CurrencyCode = currencyCode,
            AmountTryFixed = amountTryFixed,
            AmountTrySpot = amountTrySpot,
            Notes = notes,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void UpdateAmount(
        decimal amountOriginal,
        string currencyCode,
        decimal amountTryFixed,
        decimal amountTrySpot,
        int actorUserId,
        DateTimeOffset updatedAt,
        string? notes = null)
    {
        ValidateCurrencyCode(currencyCode);

        AmountOriginal = amountOriginal;
        CurrencyCode = currencyCode;
        AmountTryFixed = amountTryFixed;
        AmountTrySpot = amountTrySpot;
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private static void ValidateMonth(int month)
    {
        if (month is < 1 or > 12)
            throw new ArgumentOutOfRangeException(nameof(month), "month must be between 1 and 12");
    }

    private static void ValidateCurrencyCode(string currencyCode)
    {
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));
    }
}
