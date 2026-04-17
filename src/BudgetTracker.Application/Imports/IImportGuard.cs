namespace BudgetTracker.Application.Imports;

/// <summary>
/// ADR-0008 §2.3 — import concurrency guard. Callers must be inside an active
/// database transaction; the lock is released automatically at transaction end
/// (commit or rollback), so there is no manual unlock and no deadlock hazard
/// on an exception path.
/// </summary>
public interface IImportGuard
{
    /// <summary>
    /// Attempts to acquire an exclusive advisory lock for the given (company, resource)
    /// pair. Returns <c>true</c> on acquire, <c>false</c> if another transaction
    /// already holds the lock — the caller should respond with HTTP 409 in that case.
    /// </summary>
    /// <param name="companyId">Tenant scope. The lock key embeds this so tenants never contend with each other.</param>
    /// <param name="resource">Logical resource name (e.g. <c>budget_entries</c>, <c>expenses</c>).</param>
    Task<bool> TryAcquireAsync(int companyId, string resource, CancellationToken cancellationToken);
}

/// <summary>
/// Thrown by import services when <see cref="IImportGuard.TryAcquireAsync"/> returns
/// false. Maps to HTTP 409 via <c>GlobalExceptionHandler</c>.
/// </summary>
public sealed class ImportConcurrencyConflictException : Exception
{
    public ImportConcurrencyConflictException(int companyId, string resource)
        : base($"Bu şirket için zaten bir '{resource}' yüklemesi devam ediyor; birkaç dakika sonra tekrar deneyin.")
    {
        CompanyId = companyId;
        Resource = resource;
    }

    public int CompanyId { get; }
    public string Resource { get; }
}
