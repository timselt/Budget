using System.Collections.Immutable;
using System.Security.Claims;
using BudgetTracker.Application.Audit;
using BudgetTracker.Infrastructure.Authentication;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("connect")]
public sealed class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogger _auditLogger;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        ApplicationDbContext dbContext,
        IAuditLogger auditLogger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _dbContext = dbContext;
        _auditLogger = auditLogger;
    }

    [HttpPost("token")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Exchange()
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("OpenIddict request cannot be retrieved.");

        if (request.IsPasswordGrantType())
        {
            return await HandlePasswordGrantAsync(request);
        }

        if (request.IsRefreshTokenGrantType())
        {
            return await HandleRefreshGrantAsync();
        }

        return BadRequest(new OpenIddictResponse
        {
            Error = OpenIddictConstants.Errors.UnsupportedGrantType,
            ErrorDescription = "Unsupported grant type."
        });
    }

    [HttpGet("userinfo")]
    public async Task<IActionResult> UserInfo()
    {
        var authResult = await HttpContext.AuthenticateAsync(
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);

        if (!authResult.Succeeded || authResult.Principal is null)
        {
            return Challenge(
                authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        var subject = authResult.Principal.GetClaim(OpenIddictConstants.Claims.Subject);
        if (string.IsNullOrEmpty(subject))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(subject);
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var companies = await _dbContext.UserCompanies
            .Where(uc => uc.UserId == user.Id)
            .Select(uc => new { uc.CompanyId, uc.IsDefault })
            .ToListAsync();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            roles,
            companies,
            activeCompanyId = authResult.Principal.GetClaim(BudgetTrackerClaims.CompanyId),
        });
    }

    private async Task<IActionResult> HandlePasswordGrantAsync(OpenIddictRequest request)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var username = request.Username ?? string.Empty;
        var user = await _userManager.FindByNameAsync(username);
        if (user is null || !user.IsActive)
        {
            await TryLogSignInFailureAsync(user?.Id, username, ipAddress);
            return Forbid(
                authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                properties: new AuthenticationProperties(new Dictionary<string, string?>
                {
                    [OpenIddictServerAspNetCoreConstants.Properties.Error] = OpenIddictConstants.Errors.InvalidGrant,
                    [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] = "Invalid credentials."
                }));
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password ?? string.Empty, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            await TryLogSignInFailureAsync(user.Id, username, ipAddress);
            return Forbid(
                authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                properties: new AuthenticationProperties(new Dictionary<string, string?>
                {
                    [OpenIddictServerAspNetCoreConstants.Properties.Error] = OpenIddictConstants.Errors.InvalidGrant,
                    [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] = "Invalid credentials."
                }));
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);

        await _auditLogger.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.UserAccount,
            EntityKey: user.Id.ToString(),
            Action: AuditActions.AuthSignIn,
            UserId: user.Id,
            IpAddress: ipAddress),
            HttpContext.RequestAborted);

        var principal = await CreatePrincipalAsync(user);
        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    // Audit on the sign-in-failure path is best-effort: if the database write fails we
    // still want the client to receive the invalid_grant response rather than a 500 from
    // GlobalExceptionHandler. The DB outage is surfaced via ILogger.
    private async Task TryLogSignInFailureAsync(int? userId, string attemptedUsername, string? ipAddress)
    {
        try
        {
            await _auditLogger.LogAsync(new AuditEvent(
                EntityName: AuditEntityNames.UserAccount,
                // Unknown users still need an entity_key; store the attempted username
                // (truncated) so security operators can correlate brute-force patterns.
                EntityKey: userId?.ToString() ?? $"unknown:{TruncateForKey(attemptedUsername)}",
                Action: AuditActions.AuthSignInFailed,
                UserId: userId,
                IpAddress: ipAddress),
                HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            var failureLogger = HttpContext.RequestServices
                .GetService(typeof(ILogger<AuthController>)) as ILogger<AuthController>;
            failureLogger?.LogError(ex, "Best-effort sign-in-failure audit write failed");
        }
    }

    private const int MaxAttemptedUsernameLength = 128;
    private static string TruncateForKey(string value) =>
        value.Length <= MaxAttemptedUsernameLength
            ? value
            : value[..MaxAttemptedUsernameLength];

    private async Task<IActionResult> HandleRefreshGrantAsync()
    {
        var info = await HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        var userId = info.Principal?.GetClaim(OpenIddictConstants.Claims.Subject);
        if (string.IsNullOrEmpty(userId))
        {
            return Forbid(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
        {
            return Forbid(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        var principal = await CreatePrincipalAsync(user);
        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    private async Task<ClaimsPrincipal> CreatePrincipalAsync(User user)
    {
        var identity = new ClaimsIdentity(
            authenticationType: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            nameType: OpenIddictConstants.Claims.Name,
            roleType: OpenIddictConstants.Claims.Role);

        identity.SetClaim(OpenIddictConstants.Claims.Subject, user.Id.ToString())
            .SetClaim(OpenIddictConstants.Claims.Email, user.Email ?? string.Empty)
            .SetClaim(OpenIddictConstants.Claims.Name, user.DisplayName)
            .SetClaim(OpenIddictConstants.Claims.PreferredUsername, user.UserName ?? user.Email ?? string.Empty);

        var roles = await _userManager.GetRolesAsync(user);
        identity.SetClaims(OpenIddictConstants.Claims.Role, roles.ToImmutableArray());

        var principal = new ClaimsPrincipal(identity);

        var defaultCompany = await _dbContext.UserCompanies
            .Where(uc => uc.UserId == user.Id)
            .OrderByDescending(uc => uc.IsDefault)
            .Select(uc => (int?)uc.CompanyId)
            .FirstOrDefaultAsync();

        if (defaultCompany.HasValue)
        {
            identity.SetClaim(BudgetTrackerClaims.CompanyId, defaultCompany.Value.ToString());
        }

        principal.SetScopes(
            OpenIddictConstants.Scopes.OpenId,
            OpenIddictConstants.Scopes.Email,
            OpenIddictConstants.Scopes.Profile,
            OpenIddictConstants.Scopes.Roles,
            OpenIddictConstants.Scopes.OfflineAccess,
            "api");

        principal.SetResources("budget-tracker-api");

        foreach (var claim in principal.Claims)
        {
            claim.SetDestinations(GetDestinations(claim));
        }

        return principal;
    }

    private static IEnumerable<string> GetDestinations(Claim claim)
    {
        yield return OpenIddictConstants.Destinations.AccessToken;

        if (claim.Type is
            OpenIddictConstants.Claims.Name or
            OpenIddictConstants.Claims.PreferredUsername or
            OpenIddictConstants.Claims.Email or
            OpenIddictConstants.Claims.Role or
            BudgetTrackerClaims.CompanyId)
        {
            yield return OpenIddictConstants.Destinations.IdentityToken;
        }
    }
}
