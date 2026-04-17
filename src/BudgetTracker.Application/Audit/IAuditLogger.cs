namespace BudgetTracker.Application.Audit;

/// <summary>
/// Writes a single append-only entry to the partitioned <c>audit_logs</c> table.
/// Implementations must never swallow failures — the audit trail is load-bearing for
/// KVKK compliance and cannot be silently lost.
/// </summary>
public interface IAuditLogger
{
    Task LogAsync(AuditEvent evt, CancellationToken cancellationToken);
}

public sealed record AuditEvent(
    string EntityName,
    string EntityKey,
    string Action,
    int? CompanyId = null,
    int? UserId = null,
    string? OldValuesJson = null,
    string? NewValuesJson = null,
    string? CorrelationId = null,
    string? IpAddress = null);

public static class AuditActions
{
    public const string AuthRegister = "AUTH_REGISTER";
    public const string AuthSignIn = "AUTH_SIGN_IN";
    public const string AuthSignInFailed = "AUTH_SIGN_IN_FAILED";
    public const string AuthSignOut = "AUTH_SIGN_OUT";
}

public static class AuditEntityNames
{
    public const string UserAccount = "UserAccount";
}
