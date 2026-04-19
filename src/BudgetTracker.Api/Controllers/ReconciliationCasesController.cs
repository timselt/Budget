using BudgetTracker.Application.Reconciliation.Cases;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Sprint 2 Task 7 — Reconciliation Case CRUD + line aksiyon endpoint'leri.
/// Route scope: /api/v1/reconciliation/cases ve /api/v1/reconciliation/lines.
/// Tüm endpoint'ler tenant-scoped (CompanyId filter).
/// </summary>
[ApiController]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ReconciliationCasesController : ControllerBase
{
    private readonly IReconciliationCaseService _service;
    private readonly ITenantContext _tenant;

    public ReconciliationCasesController(
        IReconciliationCaseService service,
        ITenantContext tenant)
    {
        _service = service;
        _tenant = tenant;
    }

    [HttpGet("api/v1/reconciliation/cases")]
    [Authorize(Policy = "Reconciliation.ViewReports")]
    public async Task<IActionResult> List(
        [FromQuery] ReconciliationFlow? flow,
        [FromQuery(Name = "period_code")] string? periodCode,
        [FromQuery] ReconciliationCaseStatus? status,
        [FromQuery(Name = "customer_id")] int? customerId,
        [FromQuery(Name = "owner_user_id")] int? ownerUserId,
        [FromQuery(Name = "batch_id")] int? batchId,
        CancellationToken cancellationToken)
    {
        var companyId = RequireCompanyId();
        var result = await _service.ListAsync(
            new CaseListQuery(flow, periodCode, status, customerId, ownerUserId, batchId),
            companyId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("api/v1/reconciliation/cases/{id:int}")]
    [Authorize(Policy = "Reconciliation.ViewReports")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var companyId = RequireCompanyId();
        var detail = await _service.GetByIdAsync(id, companyId, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost("api/v1/reconciliation/cases/{id:int}/assign-owner")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public async Task<IActionResult> AssignOwner(
        int id,
        [FromBody] AssignOwnerRequest request,
        CancellationToken cancellationToken)
    {
        if (request.UserId <= 0)
            return BadRequest(new { error = "userId > 0 required" });
        var companyId = RequireCompanyId();
        var actorId = this.GetRequiredUserId();
        try
        {
            var result = await _service.AssignOwnerAsync(
                id, request.UserId, companyId, actorId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPatch("api/v1/reconciliation/lines/{id:int}")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public async Task<IActionResult> UpdateLine(
        int id,
        [FromBody] UpdateLineRequest request,
        CancellationToken cancellationToken)
    {
        var companyId = RequireCompanyId();
        var actorId = this.GetRequiredUserId();
        try
        {
            var result = await _service.UpdateLineAsync(id, request, companyId, actorId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Line update rejected",
                Detail = ex.Message,
            });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("api/v1/reconciliation/lines/{id:int}/ready")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public async Task<IActionResult> MarkLineReady(
        int id, CancellationToken cancellationToken)
    {
        var companyId = RequireCompanyId();
        var actorId = this.GetRequiredUserId();
        try
        {
            var result = await _service.MarkLineReadyAsync(id, companyId, actorId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidCaseTransitionException ex)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Case state transition rejected",
                Detail = ex.Message,
                Extensions = { ["from"] = ex.From.ToString(), ["to"] = ex.To.ToString() },
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Line cannot be marked Ready",
                Detail = ex.Message,
            });
        }
    }

    private int RequireCompanyId() => _tenant.CurrentCompanyId
        ?? throw new InvalidOperationException("tenant context missing company_id");
}
