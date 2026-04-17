using BudgetTracker.Application.BackgroundJobs;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

public sealed class TcmbFxSyncJob : ITcmbFxSyncJob
{
    // Pipeline is keyed on the retry parameters so services registered as Scoped can
    // safely take a new instance per run without rebuilding Polly's internal state
    // each time. In practice the options are static for the lifetime of the process;
    // the cache keeps one pipeline per unique option tuple.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<
        (int Attempts, long DelayTicks), ResiliencePipeline<int>> PipelineCache = new();

    private readonly ITcmbFxService _tcmb;
    private readonly IClock _clock;
    private readonly ILogger<TcmbFxSyncJob> _logger;
    private readonly ResiliencePipeline<int> _pipeline;

    public TcmbFxSyncJob(
        ITcmbFxService tcmb,
        IClock clock,
        IOptions<TcmbFxSyncOptions> options,
        ILogger<TcmbFxSyncJob> logger)
    {
        _tcmb = tcmb;
        _clock = clock;
        _logger = logger;

        var opts = options.Value;
        _pipeline = PipelineCache.GetOrAdd(
            (opts.MaxRetryAttempts, opts.InitialRetryDelay.Ticks),
            _ => BuildPipeline(opts, logger));
    }

    private static ResiliencePipeline<int> BuildPipeline(
        TcmbFxSyncOptions opts, ILogger<TcmbFxSyncJob> logger) =>
        new ResiliencePipelineBuilder<int>()
            .AddRetry(new RetryStrategyOptions<int>
            {
                MaxRetryAttempts = opts.MaxRetryAttempts,
                Delay = opts.InitialRetryDelay,
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = new PredicateBuilder<int>()
                    .Handle<HttpRequestException>(),
                OnRetry = args =>
                {
                    logger.LogWarning(args.Outcome.Exception,
                        "TCMB sync retry #{Attempt} after {Delay}",
                        args.AttemptNumber, args.RetryDelay);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime);
        _logger.LogInformation("TCMB FX sync starting for {Date}", today);

        try
        {
            var synced = await _pipeline.ExecuteAsync(
                async token => await _tcmb.SyncRatesAsync(today, token),
                cancellationToken);
            _logger.LogInformation(
                "TCMB FX sync succeeded: date={Date} syncedCount={Count}", today, synced);
        }
        catch (HttpRequestException ex)
        {
            var fallback = PreviousBusinessDay(today);
            _logger.LogWarning(ex,
                "TCMB sync for {Date} exhausted all retries; falling back to previous business day {Fallback}",
                today, fallback);

            // Fallback has no retry — if the previous business day also fails, the job
            // surfaces the exception so Hangfire records a failed run and the next
            // scheduled occurrence retries the whole flow.
            var synced = await _tcmb.SyncRatesAsync(fallback, cancellationToken);
            _logger.LogInformation(
                "TCMB FX fallback sync: date={Date} syncedCount={Count}", fallback, synced);
        }
    }

    internal static DateOnly PreviousBusinessDay(DateOnly date)
    {
        var prev = date.AddDays(-1);
        while (prev.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            prev = prev.AddDays(-1);
        }
        return prev;
    }
}
