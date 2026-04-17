using System.Data.Common;
using BudgetTracker.Core.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BudgetTracker.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Each opened DB connection gets <c>app.current_company_id</c> GUC set so that
/// Postgres RLS policies can enforce tenant isolation. Bypass scope (system jobs)
/// or no-tenant scope resets the GUC to an empty string, which evaluates against
/// <c>NULLIF(current_setting(...), '')::INT</c> as NULL and produces the default-deny
/// behaviour wired into the RLS policies (see ADR-0002 §2.2).
/// </summary>
/// <remarks>
/// Both the async (<see cref="ConnectionOpenedAsync"/>) and the sync
/// (<see cref="ConnectionOpened"/>) overrides issue their own commands against the
/// connection directly, rather than bridging sync ⇄ async. ADR-0007 §2.7 closed the
/// earlier sync-over-async hazard flagged on the F1 branch — the fix keeps both
/// paths deadlock-free while retaining the same GUC semantics.
/// </remarks>
public sealed class TenantConnectionInterceptor : DbConnectionInterceptor
{
    private const string GucName = "app.current_company_id";
    private const string SetConfigSql = "SELECT set_config('" + GucName + "', @cid, false)";

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
        var value = ResolveGucValue();
        try
        {
            await using var cmd = BuildSetConfigCommand(connection, value);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        catch
        {
            // A silently swallowed failure here leaves the connection open with no
            // GUC set, which would cause the RLS policies to fall into the empty-string
            // default-deny branch — the caller would then see "no rows" and misdiagnose
            // a tenant visibility problem. Close the connection and rethrow so the
            // caller sees an explicit error.
            await connection.CloseAsync();
            throw;
        }
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        // Synchronous path: issue the command with sync ADO.NET so we do not bridge
        // an async call back to sync via .GetAwaiter().GetResult() (deadlock risk on
        // legacy sync contexts, flagged by csharp-reviewer on feat/f1-operational-closure).
        var value = ResolveGucValue();
        try
        {
            using var cmd = BuildSetConfigCommand(connection, value);
            cmd.ExecuteNonQuery();
        }
        catch
        {
            connection.Close();
            throw;
        }
    }

    private string ResolveGucValue()
    {
        if (_tenantContext.BypassFilter || _tenantContext.CurrentCompanyId is not { } companyId)
        {
            return string.Empty;
        }
        return companyId.ToString();
    }

    private static DbCommand BuildSetConfigCommand(DbConnection connection, string value)
    {
        var cmd = connection.CreateCommand();
        cmd.CommandText = SetConfigSql;
        var p = cmd.CreateParameter();
        p.ParameterName = "cid";
        p.Value = value;
        cmd.Parameters.Add(p);
        return cmd;
    }
}
