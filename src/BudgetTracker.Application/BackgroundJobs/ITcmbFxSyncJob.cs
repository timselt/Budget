namespace BudgetTracker.Application.BackgroundJobs;

/// <summary>
/// Recurring job that synchronises TCMB reference rates for the current business day.
/// Applies exponential-backoff retry on transient network failures and falls back to
/// the previous business day when the target day is unavailable (e.g. TCMB has not
/// published yet or the day is a market holiday).
/// </summary>
public interface ITcmbFxSyncJob
{
    Task ExecuteAsync(CancellationToken cancellationToken);
}

public sealed class TcmbFxSyncOptions
{
    public const string SectionName = "Tcmb:Sync";

    /// <summary>Number of retry attempts after the initial call (Polly semantics).</summary>
    public int MaxRetryAttempts { get; init; } = 3;

    /// <summary>
    /// Base delay for the first retry. Subsequent retries back off exponentially.
    /// Kept configurable so unit tests can run without real sleeps.
    /// </summary>
    public TimeSpan InitialRetryDelay { get; init; } = TimeSpan.FromSeconds(2);
}
