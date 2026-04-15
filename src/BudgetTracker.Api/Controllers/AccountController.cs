using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/account")]
public sealed class AccountController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _dbContext;

    public AccountController(UserManager<User> userManager, ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _dbContext = dbContext;
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

        return Ok(new { id = user.Id, email = user.Email });
    }
}
