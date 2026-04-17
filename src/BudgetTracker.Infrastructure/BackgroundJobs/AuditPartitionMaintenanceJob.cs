using System.Globalization;
using System.Text.RegularExpressions;
using BudgetTracker.Application.BackgroundJobs;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

public sealed partial class AuditPartitionMaintenanceJob : IAuditPartitionMaintenanceJob
{
    // KVKK retention: 7 years of audit trail (§ADR-0002 §2.5).
    public const int RetentionMonths = 84;

    // Keep three months ahead of the current month so any clock skew or late-month
    // runs still land inside an existing partition.
    public const int FutureMonthsToCreate = 3;

    private static readonly Regex PartitionNameRegex = CompiledPartitionRegex();

    private readonly ApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly ILogger<AuditPartitionMaintenanceJob> _logger;

    public AuditPartitionMaintenanceJob(
        ApplicationDbContext db,
        IClock clock,
        ILogger<AuditPartitionMaintenanceJob> logger)
    {
        _db = db;
        _clock = clock;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime);
        var currentMonth = new DateOnly(today.Year, today.Month, 1);

        _logger.LogInformation(
            "Audit partition maintenance starting: month={Month} futureCreate={Future} retentionMonths={Retention}",
            currentMonth, FutureMonthsToCreate, RetentionMonths);

        // 1) Ensure current month + next N months exist.
        //    Per-partition try/catch: if one partition fails (e.g. transient Postgres error)
        //    we still attempt the remaining months so a whole swath of rows isn't left
        //    without a partition to land in.
        for (var offset = 0; offset <= FutureMonthsToCreate; offset++)
        {
            var monthStart = currentMonth.AddMonths(offset);
            try
            {
                await EnsurePartitionAsync(monthStart, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to ensure audit partition for {Month}; continuing with remaining months",
                    monthStart);
            }
        }

        // 2) Re-assert role grants on every partition so a missed grant (e.g. partition
        //    created manually during an incident) is repaired on the next monthly run.
        //    GRANT is idempotent on Postgres — repeating it is a no-op when already present.
        await _db.Database.ExecuteSqlRawAsync(
            "GRANT INSERT, SELECT ON ALL TABLES IN SCHEMA public TO budget_app;",
            cancellationToken);

        // 3) Drop partitions older than the retention cutoff.
        //    Strict less-than: the cutoff month itself is preserved. 84 months == 7 years
        //    (KVKK requirement), so e.g. run-month 2026-06 keeps 2019-06 and drops 2019-05.
        var cutoff = currentMonth.AddMonths(-RetentionMonths);
        var existing = await ListExistingPartitionsAsync(cancellationToken);

        foreach (var partitionName in existing)
        {
            var match = PartitionNameRegex.Match(partitionName);
            if (!match.Success) continue;

            var year = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
            var month = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
            var partitionStart = new DateOnly(year, month, 1);

            if (partitionStart < cutoff)
            {
                try
                {
                    await DropPartitionAsync(partitionName, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Failed to drop expired partition {Name}; will retry on next run",
                        partitionName);
                }
            }
        }

        _logger.LogInformation("Audit partition maintenance completed");
    }

    private async Task EnsurePartitionAsync(DateOnly monthStart, CancellationToken ct)
    {
        var monthEnd = monthStart.AddMonths(1);
        var partitionName = FormatPartitionName(monthStart);
        var startLiteral = $"{monthStart:yyyy-MM-dd} 00:00:00+00";
        var endLiteral = $"{monthEnd:yyyy-MM-dd} 00:00:00+00";

        // pg_class is used (not information_schema.tables) because partitions of a
        // partitioned table do not always show up in information_schema on every PG version.
        // The nspname filter pins the check to the public schema so a same-named relation
        // in another schema cannot produce a false positive and skip creation.
        var sql =
            $"DO $$ BEGIN " +
            $"IF NOT EXISTS (" +
            $"    SELECT 1 FROM pg_class c " +
            $"    JOIN pg_namespace n ON n.oid = c.relnamespace " +
            $"    WHERE c.relname = '{partitionName}' AND n.nspname = 'public'" +
            $") THEN " +
            $"EXECUTE 'CREATE TABLE public.{partitionName} PARTITION OF public.audit_logs " +
            $"FOR VALUES FROM (''{startLiteral}'') TO (''{endLiteral}'')'; " +
            $"END IF; END $$;";

        await _db.Database.ExecuteSqlRawAsync(sql, ct);
        _logger.LogDebug("Ensured audit partition {Name}", partitionName);
    }

    private async Task<List<string>> ListExistingPartitionsAsync(CancellationToken ct)
    {
        // Use EF's SqlQuery<T> so the query joins the ambient DbContext connection and
        // any currently-open transaction, and so connection lifetime is managed by EF.
        return await _db.Database.SqlQuery<string>($"""
            SELECT c.relname AS "Value"
            FROM pg_inherits i
            JOIN pg_class c   ON c.oid = i.inhrelid
            JOIN pg_class p   ON p.oid = i.inhparent
            JOIN pg_namespace np ON np.oid = p.relnamespace
            WHERE p.relname = 'audit_logs' AND np.nspname = 'public'
            """).ToListAsync(ct);
    }

    private async Task DropPartitionAsync(string partitionName, CancellationToken ct)
    {
        // Two-step retirement (CLAUDE.md §Bilinen Tuzaklar #5): DETACH first so the partition
        // becomes a standalone table, then DROP. The short window between the two statements
        // gives an operator a chance to intercept an accidental drop (e.g. clock skew caused
        // the retention math to target a live month) by taking a quick backup of the detached
        // table. Postgres does not accept table identifiers as bind parameters, so
        // interpolation is unavoidable; `partitionName` is regex-validated above.
#pragma warning disable EF1002 // identifier-only interpolation, validated via PartitionNameRegex
        await _db.Database.ExecuteSqlRawAsync(
            $"ALTER TABLE public.audit_logs DETACH PARTITION public.{partitionName};", ct);
        await _db.Database.ExecuteSqlRawAsync(
            $"DROP TABLE IF EXISTS public.{partitionName};", ct);
#pragma warning restore EF1002
        _logger.LogInformation("Detached + dropped expired audit partition {Name}", partitionName);
    }

    internal static string FormatPartitionName(DateOnly monthStart) =>
        $"audit_logs_{monthStart.Year:D4}_{monthStart.Month:D2}";

    [GeneratedRegex("^audit_logs_([0-9]{4})_([0-9]{2})$")]
    private static partial Regex CompiledPartitionRegex();
}
