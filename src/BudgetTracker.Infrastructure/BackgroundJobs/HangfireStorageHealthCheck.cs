using Hangfire;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

/// <summary>
/// ADR-0007 §2.5 — /health/ready probe that proves the Hangfire storage is reachable
/// and the monitoring API is answering. A missing/unreachable storage here means
/// recurring jobs (audit-partition-maintenance, tcmb-fx-sync) are silently idle.
/// </summary>
/// <remarks>
/// The <c>/health/ready</c> endpoint is anonymous. The description returned here is
/// deliberately minimal ("ok" / "unreachable") so operational details (server count,
/// queue depth, succeeded/failed totals) are not leaked to a probing caller; the real
/// statistics go to the structured log instead.
/// </remarks>
public sealed class HangfireStorageHealthCheck : IHealthCheck
{
    private readonly JobStorage _storage;
    private readonly ILogger<HangfireStorageHealthCheck> _logger;

    public HangfireStorageHealthCheck(JobStorage storage, ILogger<HangfireStorageHealthCheck> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Hangfire's IMonitoringApi is synchronous. Offload to the thread pool so a
            // slow Postgres response does not block the ASP.NET request thread under
            // aggressive /health/ready polling.
            var stats = await Task.Run(
                () => _storage.GetMonitoringApi().GetStatistics(),
                cancellationToken);

            _logger.LogDebug(
                "hangfire-storage healthy: servers={Servers} queues={Queues} succeeded={Succeeded}",
                stats.Servers, stats.Queues, stats.Succeeded);

            return HealthCheckResult.Healthy("ok");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "hangfire-storage probe failed");
            return HealthCheckResult.Unhealthy("unreachable");
        }
    }
}
