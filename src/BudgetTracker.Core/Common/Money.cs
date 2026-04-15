namespace BudgetTracker.Core.Common;

public readonly record struct Money
{
    public decimal Amount { get; }
    public string CurrencyCode { get; }

    private Money(decimal amount, string currencyCode)
    {
        Amount = amount;
        CurrencyCode = currencyCode;
    }

    public static Money Create(decimal amount, string currencyCode)
    {
        if (string.IsNullOrWhiteSpace(currencyCode) || currencyCode.Length != 3 || !IsAllUpper(currencyCode))
        {
            throw new ArgumentException("currency code must be 3 uppercase letters", nameof(currencyCode));
        }

        if (amount < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "amount must be non-negative");
        }

        return new Money(amount, currencyCode);
    }

    public static Money Zero(string currencyCode) => Create(0m, currencyCode);

    public Money Round(int decimals) =>
        new(Math.Round(Amount, decimals, MidpointRounding.ToEven), CurrencyCode);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.CurrencyCode);
    }

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        var result = left.Amount - right.Amount;
        if (result < 0m)
        {
            throw new InvalidOperationException("money subtraction must not produce a negative amount");
        }
        return new Money(result, left.CurrencyCode);
    }

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (!string.Equals(left.CurrencyCode, right.CurrencyCode, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"cannot operate on different currency values: {left.CurrencyCode} vs {right.CurrencyCode}");
        }
    }

    private static bool IsAllUpper(string value)
    {
        foreach (var ch in value)
        {
            if (ch is < 'A' or > 'Z')
            {
                return false;
            }
        }
        return true;
    }
}
