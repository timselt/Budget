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
    public bool Authorize([NotNull] DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return AuthorizeHttpContext(httpContext);
    }

    /// <summary>
    /// Extracted to a static method so unit tests can exercise the authorisation
    /// logic with a <see cref="DefaultHttpContext"/> instead of mocking the
    /// Hangfire-internal abstract <see cref="DashboardContext"/>.
    /// </summary>
    internal static bool AuthorizeHttpContext(HttpContext httpContext)
    {
        var user = httpContext.User;
        if (user?.Identity?.IsAuthenticated is not true)
        {
            return false;
        }

        return user.IsInRole(RoleNames.Admin) || user.IsInRole(RoleNames.Cfo);
    }
}
