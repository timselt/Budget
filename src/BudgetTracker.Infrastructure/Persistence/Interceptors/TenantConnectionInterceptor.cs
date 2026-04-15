using System.Data.Common;
using BudgetTracker.Core.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BudgetTracker.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Each opened DB connection gets app.current_company_id GUC set so that Postgres RLS
/// policies can enforce tenant isolation. Bypass scope (system jobs) leaves the GUC unset
/// which causes RLS USING (...) to evaluate against NULL — policies must allow this for
/// cross-tenant operations or use a SECURITY DEFINER role.
/// </summary>
public sealed class TenantConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.BypassFilter)
        {
            await ResetGuc(connection, cancellationToken);
            return;
        }

        if (_tenantContext.CurrentCompanyId is { } companyId)
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT set_config('app.current_company_id', @cid, false)";
            var p = cmd.CreateParameter();
            p.ParameterName = "cid";
            p.Value = companyId.ToString();
            cmd.Parameters.Add(p);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            await ResetGuc(connection, cancellationToken);
        }
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        ConnectionOpenedAsync(connection, eventData).GetAwaiter().GetResult();
    }

    private static async Task ResetGuc(DbConnection connection, CancellationToken ct)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT set_config('app.current_company_id', '', false)";
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
