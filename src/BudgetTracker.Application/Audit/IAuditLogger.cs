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

    // Mutabakat önkoşul #2 (00b) — PriceBook lifecycle.
    public const string PriceBookVersionCreated = "PRICEBOOK_VERSION_CREATED";
    public const string PriceBookApproved = "PRICEBOOK_APPROVED";
    public const string PriceBookItemsChanged = "PRICEBOOK_ITEMS_CHANGED";

    // Mutabakat önkoşul #3 (00c) — Reconciliation olay tipleri.
    // Spec: docs/Mutabakat_Modulu/docs/specs/00c_prereq_recon_agent_role.md §7.
    // Yazımları sprint 1 (Reconciliation) ile bağlanır. PriceBookApproved 00b'de tanımlı.
    public const string ReconciliationCaseOwnershipChanged = "RECONCILIATION_CASE_OWNERSHIP_CHANGED";
    public const string ReconciliationSentToCustomer = "RECONCILIATION_SENT_TO_CUSTOMER";
    public const string ReconciliationCustomerResponseReceived = "RECONCILIATION_CUSTOMER_RESPONSE_RECEIVED";
    public const string AccountingInstructionExported = "ACCOUNTING_INSTRUCTION_EXPORTED";
    public const string AccountingInstructionAcked = "ACCOUNTING_INSTRUCTION_ACKED";
    public const string RiskRuleChanged = "RISK_RULE_CHANGED";
}

public static class AuditEntityNames
{
    public const string UserAccount = "UserAccount";
    public const string BudgetVersion = "BudgetVersion";
    public const string Customer = "Customer";
    public const string PriceBook = "PriceBook";
}
