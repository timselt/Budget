namespace BudgetTracker.Core.Entities;

public sealed class Currency
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string Symbol { get; private set; } = default!;
    public int DecimalPlaces { get; private set; }

    private Currency() { }

    public static Currency Create(string code, string name, string symbol, int decimalPlaces = 2)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != 3)
        {
            throw new ArgumentException("currency code must be 3 characters", nameof(code));
        }

        return new Currency
        {
            Code = code,
            Name = name,
            Symbol = symbol,
            DecimalPlaces = decimalPlaces
        };
    }
}
