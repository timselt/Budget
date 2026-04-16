using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/budget")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class BudgetVersionsController : ControllerBase
{
    private readonly IApplicationDbContext _db;

    public BudgetVersionsController(IApplicationDbContext db)
    {
        _db = db;
    }

    public sealed record BudgetYearDto(int Id, int Year, bool IsLocked);
    public sealed record CreateBudgetYearRequest(int Year);
    public sealed record BudgetVersionDto(
        int Id, int BudgetYearId, string Name, string Status, bool IsActive,
        string? RejectionReason, DateTimeOffset CreatedAt);
    public sealed record CreateVersionRequest(string Name);
    public sealed record RejectRequest(string Reason);

    [HttpGet("years")]
    public async Task<IActionResult> GetYears(CancellationToken cancellationToken)
    {
        var years = await _db.BudgetYears
            .OrderByDescending(y => y.Year)
            .Select(y => new BudgetYearDto(y.Id, y.Year, y.IsLocked))
            .ToListAsync(cancellationToken);
        return Ok(years);
    }

    [HttpPost("years")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CreateYear(
        [FromBody] CreateBudgetYearRequest request, CancellationToken cancellationToken)
    {
        var exists = await _db.BudgetYears
            .AnyAsync(y => y.Year == request.Year, cancellationToken);
        if (exists)
            return Conflict(new { error = $"Budget year {request.Year} already exists" });

        var year = BudgetYear.Create(GetCompanyId(), request.Year, DateTimeOffset.UtcNow, GetUserId());
        _db.BudgetYears.Add(year);
        await _db.SaveChangesAsync(cancellationToken);

        return Created($"api/v1/budget/years/{year.Id}",
            new BudgetYearDto(year.Id, year.Year, year.IsLocked));
    }

    [HttpGet("years/{yearId:int}/versions")]
    public async Task<IActionResult> GetVersions(int yearId, CancellationToken cancellationToken)
    {
        var versions = await _db.BudgetVersions
            .Where(v => v.BudgetYearId == yearId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new BudgetVersionDto(
                v.Id, v.BudgetYearId, v.Name,
                v.Status.ToString().ToUpperInvariant(),
                v.IsActive, v.RejectionReason, v.CreatedAt))
            .ToListAsync(cancellationToken);
        return Ok(versions);
    }

    [HttpGet("versions/{versionId:int}")]
    public async Task<IActionResult> GetVersion(int versionId, CancellationToken cancellationToken)
    {
        var version = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => new BudgetVersionDto(
                v.Id, v.BudgetYearId, v.Name,
                v.Status.ToString().ToUpperInvariant(),
                v.IsActive, v.RejectionReason, v.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        if (version is null) return NotFound();
        return Ok(version);
    }

    [HttpPost("years/{yearId:int}/versions")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CreateVersion(
        int yearId, [FromBody] CreateVersionRequest request, CancellationToken cancellationToken)
    {
        var yearExists = await _db.BudgetYears
            .AnyAsync(y => y.Id == yearId, cancellationToken);
        if (!yearExists) return NotFound(new { error = "Budget year not found" });

        var version = BudgetVersion.CreateDraft(GetCompanyId(), yearId, request.Name, GetUserId());
        _db.BudgetVersions.Add(version);
        await _db.SaveChangesAsync(cancellationToken);

        return Created($"api/v1/budget/versions/{version.Id}",
            new BudgetVersionDto(
                version.Id, version.BudgetYearId, version.Name,
                version.Status.ToString().ToUpperInvariant(),
                version.IsActive, version.RejectionReason, version.CreatedAt));
    }

    [HttpPost("versions/{versionId:int}/submit")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Submit(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.Submit(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/approve/dept")]
    [Authorize(Policy = "DepartmentHead")]
    public async Task<IActionResult> ApproveDept(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.ApproveByDepartment(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/approve/finance")]
    [Authorize(Policy = "FinanceManager")]
    public async Task<IActionResult> ApproveFinance(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.ApproveByFinance(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/approve/cfo")]
    [Authorize(Policy = "Cfo")]
    public async Task<IActionResult> ApproveCfo(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.ApproveByCfo(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/activate")]
    [Authorize(Policy = "Cfo")]
    public async Task<IActionResult> Activate(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.Activate(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/reject")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Reject(
        int versionId, [FromBody] RejectRequest request, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.Reject(GetUserId(), request.Reason);
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    [HttpPost("versions/{versionId:int}/archive")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Archive(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        version.Archive(GetUserId());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    private async Task<BudgetVersion?> FindVersionAsync(int versionId, CancellationToken cancellationToken) =>
        await _db.BudgetVersions.FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken);

    private static BudgetVersionDto ToDto(BudgetVersion v) =>
        new(v.Id, v.BudgetYearId, v.Name,
            v.Status.ToString().ToUpperInvariant(),
            v.IsActive, v.RejectionReason, v.CreatedAt);

    private int GetUserId() =>
        int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("User ID claim not found"));

    private int GetCompanyId()
    {
        var claim = User.FindFirst("company_id")?.Value
            ?? throw new InvalidOperationException("Company ID claim not found");
        return int.Parse(claim);
    }
}
