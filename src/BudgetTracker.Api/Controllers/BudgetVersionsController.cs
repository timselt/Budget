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
                v.Status.ToString(),
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
                v.Status.ToString(),
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

        return Created($"api/v1/budget/versions/{version.Id}", ToDto(version));
    }

    /// <summary>Draft | Rejected → PendingFinance.</summary>
    [HttpPost("versions/{versionId:int}/submit")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Submit(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        try { version.Submit(GetUserId()); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    /// <summary>PendingFinance → PendingCfo.</summary>
    [HttpPost("versions/{versionId:int}/approve-finance")]
    [Authorize(Policy = "FinanceManager")]
    public async Task<IActionResult> ApproveFinance(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        try { version.ApproveByFinance(GetUserId()); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    /// <summary>PendingCfo → Active (atomic). Aynı yıldaki mevcut Active varsa Archived'a çekilir.</summary>
    [HttpPost("versions/{versionId:int}/approve-cfo-activate")]
    [Authorize(Policy = "Cfo")]
    public async Task<IActionResult> ApproveCfoAndActivate(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        var currentActive = await _db.BudgetVersions
            .FirstOrDefaultAsync(
                v => v.BudgetYearId == version.BudgetYearId
                     && v.Status == BudgetVersionStatus.Active
                     && v.Id != version.Id,
                cancellationToken);

        try { version.ApproveByCfoAndActivate(GetUserId(), currentActive); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    /// <summary>PendingFinance | PendingCfo → Rejected.</summary>
    [HttpPost("versions/{versionId:int}/reject")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Reject(
        int versionId, [FromBody] RejectRequest request, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        try { version.Reject(GetUserId(), request.Reason); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    /// <summary>Active → Archived.</summary>
    [HttpPost("versions/{versionId:int}/archive")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Archive(int versionId, CancellationToken cancellationToken)
    {
        var version = await FindVersionAsync(versionId, cancellationToken);
        if (version is null) return NotFound();

        try { version.Archive(GetUserId()); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(version));
    }

    /// <summary>
    /// Active versiyondan revizyon taslağı açar: yeni Draft + eski versiyonun
    /// tüm budget_entries'leri yeni taslağa kopyalanır.
    /// </summary>
    [HttpPost("versions/{versionId:int}/create-revision")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CreateRevision(int versionId, CancellationToken cancellationToken)
    {
        var source = await FindVersionAsync(versionId, cancellationToken);
        if (source is null) return NotFound();

        if (source.Status != BudgetVersionStatus.Active)
            return BadRequest(new { error = "Only Active versions can be revised" });

        // Yıl başına tek çalışılan taslak invariant'ını pre-check.
        var inProgressExists = await _db.BudgetVersions.AnyAsync(
            v => v.BudgetYearId == source.BudgetYearId
                 && (v.Status == BudgetVersionStatus.Draft
                     || v.Status == BudgetVersionStatus.PendingFinance
                     || v.Status == BudgetVersionStatus.PendingCfo
                     || v.Status == BudgetVersionStatus.Rejected),
            cancellationToken);
        if (inProgressExists)
            return Conflict(new { error = "Bu yılda zaten çalışılan bir taslak var" });

        var siblingCount = await _db.BudgetVersions
            .CountAsync(v => v.BudgetYearId == source.BudgetYearId, cancellationToken);
        var year = await _db.BudgetYears
            .Where(y => y.Id == source.BudgetYearId)
            .Select(y => y.Year)
            .FirstAsync(cancellationToken);
        var newName = $"{year} V{siblingCount + 1} Taslak";

        var newVersion = BudgetVersion.CreateDraft(
            GetCompanyId(),
            source.BudgetYearId,
            newName,
            GetUserId());

        _db.BudgetVersions.Add(newVersion);
        await _db.SaveChangesAsync(cancellationToken);

        // Aktif versiyonun budget_entries'ini yeni taslağa kopyala.
        var sourceEntries = await _db.BudgetEntries
            .Where(e => e.VersionId == source.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var actorId = GetUserId();
        foreach (var e in sourceEntries)
        {
            var clone = BudgetEntry.Create(
                companyId: e.CompanyId,
                versionId: newVersion.Id,
                customerId: e.CustomerId,
                month: e.Month,
                entryType: e.EntryType,
                amountOriginal: e.AmountOriginal,
                currencyCode: e.CurrencyCode,
                amountTryFixed: e.AmountTryFixed,
                amountTrySpot: e.AmountTrySpot,
                createdByUserId: actorId,
                createdAt: now,
                notes: e.Notes,
                productId: e.ProductId,
                quantity: e.Quantity,
                contractId: e.ContractId);
            _db.BudgetEntries.Add(clone);
        }
        if (sourceEntries.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);

        return Created($"api/v1/budget/versions/{newVersion.Id}", ToDto(newVersion));
    }

    private async Task<BudgetVersion?> FindVersionAsync(int versionId, CancellationToken cancellationToken) =>
        await _db.BudgetVersions.FirstOrDefaultAsync(v => v.Id == versionId, cancellationToken);

    private static BudgetVersionDto ToDto(BudgetVersion v) =>
        new(v.Id, v.BudgetYearId, v.Name,
            v.Status.ToString(),
            v.IsActive, v.RejectionReason, v.CreatedAt);

    private int GetUserId() => this.GetRequiredUserId();

    private int GetCompanyId()
    {
        var claim = User.FindFirst("company_id")?.Value
            ?? throw new InvalidOperationException("Company ID claim not found");
        return int.Parse(claim);
    }
}
