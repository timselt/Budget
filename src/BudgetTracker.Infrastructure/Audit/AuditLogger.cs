using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Audit;

public sealed class AuditLogger : IAuditLogger
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly ILogger<AuditLogger> _logger;

    public AuditLogger(IApplicationDbContext db, IClock clock, ILogger<AuditLogger> logger)
    {
        _db = db;
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

        _db.AuditLogs.Add(entry);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
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
