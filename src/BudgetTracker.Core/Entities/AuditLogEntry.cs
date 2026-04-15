namespace BudgetTracker.Core.Entities;

public sealed class AuditLogEntry
{
    public long Id { get; private set; }
    public int? CompanyId { get; private set; }
    public int? UserId { get; private set; }
    public string EntityName { get; private set; } = default!;
    public string EntityKey { get; private set; } = default!;
    public string Action { get; private set; } = default!;
    public string? OldValuesJson { get; private set; }
    public string? NewValuesJson { get; private set; }
    public string? CorrelationId { get; private set; }
    public string? IpAddress { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private AuditLogEntry() { }

    public static AuditLogEntry Create(
        int? companyId,
        int? userId,
        string entityName,
        string entityKey,
        string action,
        string? oldValuesJson,
        string? newValuesJson,
        string? correlationId,
        string? ipAddress,
        DateTimeOffset createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(entityName);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(action);

        return new AuditLogEntry
        {
            CompanyId = companyId,
            UserId = userId,
            EntityName = entityName,
            EntityKey = entityKey,
            Action = action,
            OldValuesJson = oldValuesJson,
            NewValuesJson = newValuesJson,
            CorrelationId = correlationId,
            IpAddress = ipAddress,
            CreatedAt = createdAt
        };
    }
}
