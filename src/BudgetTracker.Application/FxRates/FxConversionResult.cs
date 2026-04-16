namespace BudgetTracker.Application.FxRates;

public sealed record FxConversionResult(
    decimal AmountTryFixed,
    decimal AmountTrySpot,
    decimal FixedRate,
    decimal SpotRate);
