namespace BudgetTracker.Application.FxRates;

public interface ITcmbFxService
{
    Task<int> SyncRatesAsync(DateOnly date, CancellationToken cancellationToken);
}
