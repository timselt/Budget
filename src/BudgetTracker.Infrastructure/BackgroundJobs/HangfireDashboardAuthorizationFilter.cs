using BudgetTracker.Core.Identity;
using Hangfire.Annotations;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Http;

namespace BudgetTracker.Infrastructure.BackgroundJobs;

/// <summary>
/// Dashboard auth filter that requires an authenticated user in the Admin or Cfo role
/// (ADR-0007 §2.1). CLAUDE.md §Bilinen Tuzaklar #2 flags the default
/// <c>LocalRequestsOnlyAuthorizationFilter</c> as a production hazard on Railway —
/// this filter replaces it.
/// </summary>
/// <remarks>
/// Browser flow: the user must first sign in through <c>/connect/authorize</c> which
/// sets the OpenIddict cookie (see <c>AuthenticationExtensions.AddCookie</c>). Once
/// authenticated, <see cref="HttpContext.User"/> exposes the role claims and
/// <see cref="AuthorizeHttpContext"/> validates them.
/// </remarks>
public sealed class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize([NotNull] DashboardContext context) =>
        AuthorizeHttpContext(context.GetHttpContext());

    /// <summary>
    /// Single decision point — extracted so unit tests can exercise it with a
    /// <see cref="DefaultHttpContext"/> instead of mocking the Hangfire-internal
    /// abstract <see cref="DashboardContext"/>. Side-effects the response status
    /// code so <c>/hangfire</c> matches ADR-0007 §2.1 semantics:
    /// anonymous → 401, authenticated-wrong-role → 403.
    /// </summary>
    internal static bool AuthorizeHttpContext(HttpContext httpContext)
    {
        var user = httpContext.User;
        var authenticated = user?.Identity?.IsAuthenticated is true;

        if (!authenticated)
        {
            httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return false;
        }

        if (user!.IsInRole(RoleNames.Admin) || user.IsInRole(RoleNames.Cfo))
        {
            return true;
        }

        httpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
        return false;
    }
}
