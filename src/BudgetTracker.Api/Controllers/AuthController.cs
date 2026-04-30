using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Auth endpoint'leri (Faz 1.5 — TAG Portal SSO).
/// Eski OpenIddict server password grant endpoint'leri (`/connect/token`,
/// `/connect/userinfo`) kaldırıldı; FinOps Tur artık OIDC client.
///
/// Akış:
///   1. SPA → POST /api/auth/login → 302 redirect TAG Portal /connect/authorize
///   2. TAG Portal login + consent → callback /signin-oidc
///   3. OIDC handler cookie set eder, SPA dashboard'a iner
///   4. SPA → GET /api/auth/me → kullanıcı + claim JSON
///   5. SPA → POST /api/auth/logout → cookie clear + TAG Portal /connect/logout
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    /// <summary>
    /// OIDC challenge başlatır → TAG Portal'a redirect.
    /// SPA bu endpoint'e tarayıcıyı yönlendirir (window.location veya form submit).
    /// </summary>
    [HttpGet("login")]
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        var safeReturnUrl = string.IsNullOrEmpty(returnUrl) || !Url.IsLocalUrl(returnUrl)
            ? "/"
            : returnUrl;

        var props = new AuthenticationProperties
        {
            RedirectUri = safeReturnUrl,
            IsPersistent = true,
        };

        return Challenge(props, OpenIdConnectDefaults.AuthenticationScheme);
    }

    /// <summary>
    /// Cookie sign-out + OIDC RP-Initiated Logout.
    /// TAG Portal session'ı da iptal edilir; geri kullanıcı FinOps Tur ana sayfasına döner.
    /// </summary>
    [HttpGet("logout")]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromQuery] string? returnUrl = null)
    {
        var safeReturnUrl = string.IsNullOrEmpty(returnUrl) || !Url.IsLocalUrl(returnUrl)
            ? "/"
            : returnUrl;

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        var props = new AuthenticationProperties
        {
            RedirectUri = safeReturnUrl,
        };

        return SignOut(props, OpenIdConnectDefaults.AuthenticationScheme);
    }

    /// <summary>
    /// Sessizce 403 dönen yönlendirme hedefi (Cookie auth AccessDeniedPath).
    /// </summary>
    [HttpGet("forbidden")]
    [AllowAnonymous]
    public IActionResult Forbidden() => StatusCode(StatusCodes.Status403Forbidden, new
    {
        error = "forbidden",
        message = "Bu kaynağa erişim yetkiniz yok.",
    });

    /// <summary>
    /// Cookie ile authenticate olmuş kullanıcının claim ve rol bilgisi.
    /// SPA bu endpoint'i auth state'i bootstrap için çağırır.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return Ok(new
        {
            subject,
            email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email"),
            name = User.FindFirstValue("name") ?? User.Identity?.Name,
            roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray(),
            tagPortalRoles = User.FindAll("tag_portal_roles").Select(c => c.Value).ToArray(),
            tagPortalCompanies = User.FindAll("tag_portal_companies").Select(c => c.Value).ToArray(),
            clearanceLevel = User.FindFirstValue("clearance_level"),
            departments = User.FindAll("departments").Select(c => c.Value).ToArray(),
        });
    }
}
