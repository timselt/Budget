namespace BudgetTracker.Application.Audit;

public interface IAuditQueryService
{
    Task<PagedAuditResult> GetAuditLogsAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken);
}

public sealed record AuditLogQuery(
    int? UserId,
    string? EntityType,
    DateTimeOffset? DateFrom,
    DateTimeOffset? DateTo,
    int Page = 1,
    int Limit = 50);

public sealed record AuditLogDto(
    long Id,
    int? UserId,
    string? UserDisplayName,
    string EntityName,
    string EntityKey,
    string Action,
    string? OldValuesJson,
    string? NewValuesJson,
    string? IpAddress,
    DateTimeOffset CreatedAt);

public sealed record PagedAuditResult(
    IReadOnlyList<AuditLogDto> Items,
    int TotalCount,
    int Page,
    int Limit);
