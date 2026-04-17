namespace BudgetTracker.Application.BackgroundJobs;

/// <summary>
/// Monthly job that keeps <c>audit_logs</c> partitions rolling: creates the next N months
/// ahead and drops partitions older than the KVKK retention window (84 months / 7 years).
/// Idempotent — safe to re-run any number of times within the same month.
/// </summary>
public interface IAuditPartitionMaintenanceJob
{
    Task ExecuteAsync(CancellationToken cancellationToken);
}
