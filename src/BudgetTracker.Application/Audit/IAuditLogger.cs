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

    // F3 / ADR-0008 — Excel import lifecycle.
    public const string ImportPreviewed = "IMPORT_PREVIEWED";
    public const string ImportCommitted = "IMPORT_COMMITTED";
    public const string ImportRejectedLimit = "IMPORT_REJECTED_LIMIT";
    public const string ImportConcurrencyConflict = "IMPORT_CONCURRENCY_CONFLICT";

    // Mutabakat önkoşul #1 (00a) — Customer.external_customer_ref bağlama.
    public const string CustomerExternalRefLinked = "CUSTOMER_EXTERNAL_REF_LINKED";
}

public static class AuditEntityNames
{
    public const string UserAccount = "UserAccount";
    public const string BudgetVersion = "BudgetVersion";
    public const string Customer = "Customer";
}
