using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class SpecialItem : TenantEntity
{
    public int? VersionId { get; private set; }
    public int BudgetYearId { get; private set; }
    public SpecialItemType ItemType { get; private set; }
    public int? Month { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = default!;
    public string? Notes { get; private set; }

    private SpecialItem() { }

    public static SpecialItem Create(
        int companyId,
        int? versionId,
        int budgetYearId,
        SpecialItemType itemType,
        decimal amount,
        string currencyCode,
        int createdByUserId,
        DateTimeOffset createdAt,
        int? month = null,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (budgetYearId <= 0) throw new ArgumentOutOfRangeException(nameof(budgetYearId));
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));
        if (month.HasValue && month.Value is < 1 or > 12)
            throw new ArgumentOutOfRangeException(nameof(month), "month must be between 1 and 12");

        return new SpecialItem
        {
            CompanyId = companyId,
            VersionId = versionId,
            BudgetYearId = budgetYearId,
            ItemType = itemType,
            Month = month,
            Amount = amount,
            CurrencyCode = currencyCode,
            Notes = notes,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void UpdateAmount(
        decimal amount,
        string currencyCode,
        int actorUserId,
        DateTimeOffset updatedAt,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));

        Amount = amount;
        CurrencyCode = currencyCode;
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
