using System.Security.Claims;
using BudgetTracker.Application.Audit;
using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OpenIddict.Abstractions;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/account")]
public sealed class AccountController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogger _auditLogger;
    private readonly ILogger<AccountController> _logger;

    public AccountController(
        UserManager<User> userManager,
        ApplicationDbContext dbContext,
        IAuditLogger auditLogger,
        ILogger<AccountController> logger)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _auditLogger = auditLogger;
        _logger = logger;
    }

    public sealed record RegisterRequest(
        string Email,
        string Password,
        string DisplayName,
        int CompanyId,
        string Role);

    [HttpPost("register")]
    [Authorize(
        AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme,
        Policy = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!RoleNames.All.Contains(request.Role))
        {
            return BadRequest(new { error = "invalid_role", allowed = RoleNames.All });
        }

        var companyExists = await _dbContext.Companies
            .AnyAsync(c => c.Id == request.CompanyId);
        if (!companyExists)
        {
            return BadRequest(new { error = "company_not_found" });
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            CreatedAt = DateTimeOffset.UtcNow,
            IsActive = true,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors });
        }

        await _userManager.AddToRoleAsync(user, request.Role);

        _dbContext.UserCompanies.Add(new UserCompany
        {
            UserId = user.Id,
            CompanyId = request.CompanyId,
            IsDefault = true,
            AssignedAt = DateTimeOffset.UtcNow,
        });
        await _dbContext.SaveChangesAsync();

        // Best-effort audit: the user is already created and the register call is
        // logically successful. A failed audit write must not turn that into a 500.
        try
        {
            await _auditLogger.LogAsync(new AuditEvent(
                EntityName: AuditEntityNames.UserAccount,
                EntityKey: user.Id.ToString(),
                Action: AuditActions.AuthRegister,
                CompanyId: request.CompanyId,
                UserId: user.Id,
                IpAddress: HttpContext.Connection.RemoteIpAddress?.ToString()),
                HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Audit write failed for AUTH_REGISTER user={UserId}", user.Id);
        }

        return Ok(new { id = user.Id, email = user.Email });
    }

    [HttpPost("logout")]
    [Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
    public async Task<IActionResult> Logout()
    {
        // Stateless JWTs — the client simply discards its access token. The endpoint
        // exists so the logout event is captured in the audit trail; for server-side
        // revocation OpenIddict exposes /connect/revocation separately.
        var subject = User.FindFirstValue(OpenIddictConstants.Claims.Subject);
        if (!int.TryParse(subject, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            await _auditLogger.LogAsync(new AuditEvent(
                EntityName: AuditEntityNames.UserAccount,
                EntityKey: userId.ToString(),
                Action: AuditActions.AuthSignOut,
                UserId: userId,
                IpAddress: HttpContext.Connection.RemoteIpAddress?.ToString()),
                HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Audit write failed for AUTH_SIGN_OUT user={UserId}", userId);
        }

        return NoContent();
    }
}
