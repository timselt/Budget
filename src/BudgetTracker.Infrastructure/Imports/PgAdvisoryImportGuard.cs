using BudgetTracker.Application.Imports;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Imports;

/// <summary>
/// PostgreSQL-native implementation of <see cref="IImportGuard"/> using
/// <c>pg_try_advisory_xact_lock</c>. The lock key is a 64-bit hash of
/// <c>import:{companyId}:{resource}</c> so different tenants never contend
/// and different resources within the same tenant do not block each other.
/// </summary>
public sealed class PgAdvisoryImportGuard : IImportGuard
{
    private readonly ApplicationDbContext _db;

    public PgAdvisoryImportGuard(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<bool> TryAcquireAsync(int companyId, string resource, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(resource);

        if (_db.Database.CurrentTransaction is null)
        {
            // pg_try_advisory_xact_lock releases at transaction end. Running it outside
            // a transaction would acquire a lock that lives for the lifetime of the
            // connection — the opposite of what we want. Fail loudly instead.
            throw new InvalidOperationException(
                "IImportGuard.TryAcquireAsync must run inside an active database transaction.");
        }

        var key = BuildLockKey(companyId, resource);

        // hashtextextended(text, seed) returns bigint; pg_try_advisory_xact_lock(bigint)
        // is non-blocking and returns boolean. Both are Postgres built-ins.
        var result = await _db.Database
            .SqlQuery<bool>($"SELECT pg_try_advisory_xact_lock(hashtextextended({key}, 0)) AS \"Value\"")
            .FirstAsync(cancellationToken);

        return result;
    }

    internal static string BuildLockKey(int companyId, string resource) =>
        $"import:{companyId}:{resource}";
}
