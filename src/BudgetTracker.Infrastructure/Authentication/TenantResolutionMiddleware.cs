using System.Security.Claims;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;

namespace BudgetTracker.Infrastructure.Authentication;

public static class BudgetTrackerClaims
{
    public const string CompanyId = "company_id";
}

public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        var companyClaim = context.User.FindFirstValue(BudgetTrackerClaims.CompanyId);

        if (int.TryParse(companyClaim, out var companyId))
        {
            using (tenantContext.BeginScope(companyId))
            {
                await _next(context);
            }
            return;
        }

        await _next(context);
    }
}
