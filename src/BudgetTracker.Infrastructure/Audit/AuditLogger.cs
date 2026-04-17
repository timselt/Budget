using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Audit;

public sealed class AuditLogger : IAuditLogger
{
    // ADR-0007 §2.6: audit writes run on a short-lived, isolated DbContext produced
    // by IDbContextFactory. Sharing the scoped ApplicationDbContext with business
    // operations would let a failed business SaveChanges take the audit trail with
    // it — append-only guarantees break the moment audit and business share a
    // transaction boundary.
    private readonly IDbContextFactory<ApplicationDbContext> _dbFactory;
    private readonly IClock _clock;
    private readonly ILogger<AuditLogger> _logger;

    public AuditLogger(
        IDbContextFactory<ApplicationDbContext> dbFactory,
        IClock clock,
        ILogger<AuditLogger> logger)
    {
        _dbFactory = dbFactory;
        _clock = clock;
        _logger = logger;
    }

    public async Task LogAsync(AuditEvent evt, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(evt);

        var entry = AuditLogEntry.Create(
            companyId: evt.CompanyId,
            userId: evt.UserId,
            entityName: evt.EntityName,
            entityKey: evt.EntityKey,
            action: evt.Action,
            oldValuesJson: evt.OldValuesJson,
            newValuesJson: evt.NewValuesJson,
            correlationId: evt.CorrelationId,
            ipAddress: evt.IpAddress,
            createdAt: _clock.UtcNow);

        await using var ctx = await _dbFactory.CreateDbContextAsync(cancellationToken);
        ctx.AuditLogs.Add(entry);

        try
        {
            await ctx.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Never log EntityKey here — for failed sign-ins it contains the attempted
            // username, and a caller that passes a password-in-the-username-field would
            // leak the password to Seq/stdout. Keep diagnostics to Action + EntityName.
            _logger.LogError(ex,
                "Audit log write failed: action={Action} entity={EntityName}",
                evt.Action, evt.EntityName);
            throw;
        }
    }
}
