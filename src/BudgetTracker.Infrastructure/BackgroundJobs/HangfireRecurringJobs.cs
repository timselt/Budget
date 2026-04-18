using BudgetTracker.Application.BackgroundJobs;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.Extensions.Logging;
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
        var logger = serviceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("BudgetTracker.Infrastructure.BackgroundJobs.HangfireRecurringJobs");

        TryRegister(
            logger,
            AuditPartitionJobId,
            () => manager.AddOrUpdate<IAuditPartitionMaintenanceJob>(
                recurringJobId: AuditPartitionJobId,
                methodCall: job => job.ExecuteAsync(CancellationToken.None),
                cronExpression: "0 2 1 * *",
                options: new RecurringJobOptions { TimeZone = TurkeyTimeZone }));

        TryRegister(
            logger,
            TcmbFxSyncJobId,
            () => manager.AddOrUpdate<ITcmbFxSyncJob>(
                recurringJobId: TcmbFxSyncJobId,
                methodCall: job => job.ExecuteAsync(CancellationToken.None),
                cronExpression: "45 15 * * 1-5",
                options: new RecurringJobOptions { TimeZone = TurkeyTimeZone }));
    }

    private static void TryRegister(
        ILogger logger,
        string recurringJobId,
        Action register)
    {
        try
        {
            register();
        }
        catch (PostgreSqlDistributedLockException ex)
        {
            // Another node/process is already registering recurring jobs. Keep the API
            // online; Hangfire metadata can be reconciled on the next successful start.
            logger.LogWarning(ex,
                "Recurring job registration skipped because Hangfire lock could not be acquired: {RecurringJobId}",
                recurringJobId);
        }
    }
}
