using System.Security.Claims;
using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.BackgroundJobs;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace BudgetTracker.UnitTests.Infrastructure.BackgroundJobs;

public sealed class HangfireDashboardAuthorizationFilterTests
{
    [Fact]
    public void AuthorizeHttpContext_AnonymousRequest_DeniesAccess()
    {
        var ctx = new DefaultHttpContext();
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
    }

    [Fact]
    public void AuthorizeHttpContext_AuthenticatedViewer_DeniesAccess()
    {
        // Viewer role can hit the API but must not see the jobs dashboard —
        // jobs can trigger destructive ops (requeue, delete) and contain PII.
        var ctx = BuildContext(roles: new[] { RoleNames.Viewer });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
    }

    [Fact]
    public void AuthorizeHttpContext_AuthenticatedFinanceManager_DeniesAccess()
    {
        var ctx = BuildContext(roles: new[] { RoleNames.FinanceManager });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
    }

    [Fact]
    public void AuthorizeHttpContext_Admin_GrantsAccess()
    {
        var ctx = BuildContext(roles: new[] { RoleNames.Admin });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeTrue();
    }

    [Fact]
    public void AuthorizeHttpContext_Cfo_GrantsAccess()
    {
        var ctx = BuildContext(roles: new[] { RoleNames.Cfo });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeTrue();
    }

    [Fact]
    public void AuthorizeHttpContext_AdminPlusOthers_GrantsAccess()
    {
        var ctx = BuildContext(roles: new[] { RoleNames.Admin, RoleNames.FinanceManager });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeTrue();
    }

    [Fact]
    public void AuthorizeHttpContext_AuthenticatedButNoRoleClaim_DeniesAccess()
    {
        var identity = new ClaimsIdentity(authenticationType: "test"); // authenticated, but no roles
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
    }

    [Fact]
    public void AuthorizeHttpContext_AnonymousRequest_SetsStatusCode401()
    {
        // ADR-0007 §2.1: anonymous → 401.
        var ctx = new DefaultHttpContext();
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
        ctx.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public void AuthorizeHttpContext_AuthenticatedWrongRole_SetsStatusCode403()
    {
        // ADR-0007 §2.1: authenticated but without Admin/Cfo → 403.
        var ctx = BuildContext(roles: new[] { RoleNames.FinanceManager });
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeFalse();
        ctx.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public void AuthorizeHttpContext_Admin_DoesNotOverrideStatusCode()
    {
        var ctx = BuildContext(roles: new[] { RoleNames.Admin });
        ctx.Response.StatusCode = StatusCodes.Status200OK;
        HangfireDashboardAuthorizationFilter.AuthorizeHttpContext(ctx).Should().BeTrue();
        ctx.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    private static HttpContext BuildContext(string[] roles)
    {
        var claims = roles.Select(r => new Claim(ClaimTypes.Role, r));
        var identity = new ClaimsIdentity(claims, authenticationType: "test");
        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity),
        };
    }
}
