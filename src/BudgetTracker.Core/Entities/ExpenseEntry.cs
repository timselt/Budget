using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class ExpenseEntry : TenantEntity
{
    public int? VersionId { get; private set; }
    public int BudgetYearId { get; private set; }
    public int CategoryId { get; private set; }
    public int Month { get; private set; }
    public ExpenseEntryType EntryType { get; private set; }
    public decimal AmountOriginal { get; private set; }
    public string CurrencyCode { get; private set; } = default!;
    public decimal AmountTryFixed { get; private set; }
    public decimal AmountTrySpot { get; private set; }
    public string? Notes { get; private set; }

    private ExpenseEntry() { }

    public static ExpenseEntry Create(
        int companyId,
        int? versionId,
        int budgetYearId,
        int categoryId,
        int month,
        ExpenseEntryType entryType,
        decimal amountOriginal,
        string currencyCode,
        decimal amountTryFixed,
        decimal amountTrySpot,
        int createdByUserId,
        DateTimeOffset createdAt,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (budgetYearId <= 0) throw new ArgumentOutOfRangeException(nameof(budgetYearId));
        if (categoryId <= 0) throw new ArgumentOutOfRangeException(nameof(categoryId));
        if (month is < 1 or > 12)
            throw new ArgumentOutOfRangeException(nameof(month), "month must be between 1 and 12");
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));
        if (entryType == ExpenseEntryType.Budget && versionId is null)
            throw new ArgumentException("versionId required for budget entries", nameof(versionId));

        return new ExpenseEntry
        {
            CompanyId = companyId,
            VersionId = versionId,
            BudgetYearId = budgetYearId,
            CategoryId = categoryId,
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
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));

        AmountOriginal = amountOriginal;
        CurrencyCode = currencyCode;
        AmountTryFixed = amountTryFixed;
        AmountTrySpot = amountTrySpot;
        Notes = notes;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
