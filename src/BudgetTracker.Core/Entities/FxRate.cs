using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class FxRate : BaseEntity
{
    public string CurrencyCode { get; private set; } = default!;
    public DateOnly RateDate { get; private set; }
    public decimal RateValue { get; private set; }
    public FxRateSource Source { get; private set; }
    public bool IsYearStartFixed { get; private set; }

    private FxRate() { }

    public static FxRate Create(
        string currencyCode,
        DateOnly rateDate,
        decimal rateValue,
        FxRateSource source,
        bool isYearStartFixed,
        DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3)
        {
            throw new ArgumentException("currency code must be 3 characters", nameof(currencyCode));
        }

        if (rateValue <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(rateValue), "rate must be positive");
        }

        return new FxRate
        {
            CurrencyCode = currencyCode,
            RateDate = rateDate,
            RateValue = rateValue,
            Source = source,
            IsYearStartFixed = isYearStartFixed,
            CreatedAt = createdAt
        };
    }
}
