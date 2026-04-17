using Hangfire;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

/// <summary>
/// ADR-0007 §2.5 — /health/ready probe that proves the Hangfire storage is reachable
/// and the monitoring API is answering. A missing/unreachable storage here means
/// recurring jobs (audit-partition-maintenance, tcmb-fx-sync) are silently idle.
/// </summary>
public sealed class HangfireStorageHealthCheck : IHealthCheck
{
    private readonly JobStorage _storage;

    public HangfireStorageHealthCheck(JobStorage storage)
    {
        _storage = storage;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var monitoringApi = _storage.GetMonitoringApi();
            var stats = monitoringApi.GetStatistics();
            return Task.FromResult(HealthCheckResult.Healthy(
                $"hangfire servers={stats.Servers} queues={stats.Queues} succeeded={stats.Succeeded}"));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "Hangfire storage/monitoring API is not reachable", ex));
        }
    }
}
