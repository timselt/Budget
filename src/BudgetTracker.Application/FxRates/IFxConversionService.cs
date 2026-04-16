namespace BudgetTracker.Application.FxRates;

public interface IFxConversionService
{
    Task<FxConversionResult> ConvertToTryAsync(
        decimal amountOriginal,
        string currencyCode,
        int budgetYear,
        int month,
        CancellationToken cancellationToken);

    Task<decimal> GetRateAsync(
        string currencyCode,
        DateOnly rateDate,
        CancellationToken cancellationToken);
}
