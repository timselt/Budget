using System.Security.Claims;
using BudgetTracker.Core.Common;
using Microsoft.AspNetCore.Http;
using Serilog.Core;
using Serilog.Events;

namespace BudgetTracker.Infrastructure.Observability;

/// <summary>
/// Attaches <c>tenant_id</c>, <c>user_id</c>, <c>request_id</c> (HTTP request scope)
/// or <c>job_context=hangfire</c> (background-job scope) to every log event so Seq
/// filters can correlate lines across both surfaces (ADR-0007 §2.3).
/// </summary>
/// <remarks>
/// Null-safety is a first-class requirement: Hangfire recurring jobs run on a
/// background thread where <see cref="IHttpContextAccessor.HttpContext"/> is null.
/// The enricher never throws; missing values are simply omitted and
/// <c>job_context=hangfire</c> is added so operators can filter by context.
/// Any exception inside the enricher is swallowed to <see cref="Serilog.Debugging.SelfLog"/>
/// rather than surfaced to the caller — a logging failure must never abort the
/// operation being logged.
/// </remarks>
public sealed class BudgetTrackerLogEnricher : ILogEventEnricher
{
    private readonly IHttpContextAccessor? _httpContextAccessor;
    private readonly ITenantContext? _tenantContext;

    public BudgetTrackerLogEnricher(
        IHttpContextAccessor? httpContextAccessor,
        ITenantContext? tenantContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantContext = tenantContext;
    }

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        try
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            if (httpContext is null)
            {
                // Background-job path: HttpContext is null on Hangfire worker threads.
                // Emit job_context so operators can filter `job_context=hangfire` in Seq.
                logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("job_context", "hangfire"));

                // tenant_id from the ambient ITenantContext is still useful when a job
                // runs under a deliberately-scoped TenantContext (dev tooling).
                var jobTenantId = _tenantContext?.CurrentCompanyId;
                if (jobTenantId is { } jobTid)
                {
                    logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("tenant_id", jobTid));
                }
                return;
            }

            // HTTP request path.
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("request_id", httpContext.TraceIdentifier));

            var tenantId = _tenantContext?.CurrentCompanyId;
            if (tenantId is { } tid)
            {
                logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("tenant_id", tid));
            }

            var userIdClaim = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User?.FindFirstValue("sub");
            if (!string.IsNullOrEmpty(userIdClaim))
            {
                logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("user_id", userIdClaim));
            }
        }
        catch (Exception ex)
        {
            // Per Serilog convention: enrichers route their own failures to SelfLog so
            // the sink pipeline continues to receive the (un-enriched) event.
            Serilog.Debugging.SelfLog.WriteLine(
                "BudgetTrackerLogEnricher failed: {0}", ex);
        }
    }
}
