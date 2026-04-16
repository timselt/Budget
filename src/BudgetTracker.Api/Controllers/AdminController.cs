using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(
    AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme,
    Policy = "Admin")]
public sealed class AdminController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly IApplicationDbContext _db;

    public AdminController(
        UserManager<User> userManager,
        IApplicationDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    public sealed record AdminUserDto(
        int Id,
        string Email,
        string DisplayName,
        IReadOnlyList<string> Roles,
        bool IsActive,
        DateTimeOffset CreatedAt,
        DateTimeOffset? LastLoginAt);

    public sealed record UpdateRoleRequest(string Role);

    public sealed record AdminCompanyDto(
        int Id,
        string Code,
        string Name,
        string BaseCurrencyCode,
        DateTimeOffset CreatedAt);

    public sealed record CreateCompanyRequest(string Name, string TaxId);

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _userManager.Users
            .OrderBy(u => u.DisplayName)
            .ToListAsync(cancellationToken);

        var result = new List<AdminUserDto>(users.Count);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new AdminUserDto(
                Id: user.Id,
                Email: user.Email!,
                DisplayName: user.DisplayName,
                Roles: roles.ToList(),
                IsActive: user.IsActive,
                CreatedAt: user.CreatedAt,
                LastLoginAt: user.LastLoginAt));
        }

        return Ok(result);
    }

    [HttpPut("users/{id:int}/role")]
    public async Task<IActionResult> UpdateUserRole(
        int id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        if (!RoleNames.All.Contains(request.Role))
        {
            return BadRequest(new { error = "invalid_role", allowed = RoleNames.All });
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound(new { error = "user_not_found" });
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
            {
                return BadRequest(new { errors = removeResult.Errors });
            }
        }

        var addResult = await _userManager.AddToRoleAsync(user, request.Role);
        if (!addResult.Succeeded)
        {
            return BadRequest(new { errors = addResult.Errors });
        }

        return Ok(new { id = user.Id, role = request.Role });
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(CancellationToken cancellationToken)
    {
        var companies = await _db.Companies
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new AdminCompanyDto(
                c.Id,
                c.Code,
                c.Name,
                c.BaseCurrencyCode,
                c.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(companies);
    }

    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany(
        [FromBody] CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TaxId))
        {
            return BadRequest(new { error = "name_and_tax_id_required" });
        }

        var userId = GetUserId();
        var company = Company.Create(
            code: request.TaxId,
            name: request.Name,
            baseCurrencyCode: "TRY",
            createdAt: DateTimeOffset.UtcNow,
            createdByUserId: userId);

        _db.Companies.Add(company);
        await _db.SaveChangesAsync(cancellationToken);

        return Created($"api/v1/admin/companies/{company.Id}", new AdminCompanyDto(
            company.Id,
            company.Code,
            company.Name,
            company.BaseCurrencyCode,
            company.CreatedAt));
    }

    private int GetUserId() =>
        int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("User ID claim not found"));
}
