using BudgetTracker.Application.BackgroundJobs;
using Hangfire;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

public static class HangfireRecurringJobs
{
    public const string AuditPartitionJobId = "audit-partition-maintenance";
    public const string TcmbFxSyncJobId = "tcmb-fx-sync";

    public static TimeZoneInfo TurkeyTimeZone { get; } =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public static void Register(IServiceProvider serviceProvider)
    {
        var manager = serviceProvider.GetRequiredService<IRecurringJobManager>();

        // 1st of each month at 02:00 Europe/Istanbul — creates upcoming partitions
        // and drops any that have fallen out of the 84-month retention window.
        manager.AddOrUpdate<IAuditPartitionMaintenanceJob>(
            recurringJobId: AuditPartitionJobId,
            methodCall: job => job.ExecuteAsync(CancellationToken.None),
            cronExpression: "0 2 1 * *",
            options: new RecurringJobOptions { TimeZone = TurkeyTimeZone });

        // Business days at 15:45 Europe/Istanbul. TCMB publishes the daily reference
        // rates around 15:30; the 15-minute buffer covers their typical publish window.
        manager.AddOrUpdate<ITcmbFxSyncJob>(
            recurringJobId: TcmbFxSyncJobId,
            methodCall: job => job.ExecuteAsync(CancellationToken.None),
            cronExpression: "45 15 * * 1-5",
            options: new RecurringJobOptions { TimeZone = TurkeyTimeZone });
    }
}
