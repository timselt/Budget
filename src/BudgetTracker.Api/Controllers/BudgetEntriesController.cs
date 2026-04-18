using BudgetTracker.Application.BudgetEntries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/budget/versions/{versionId:int}/entries")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class BudgetEntriesController : ControllerBase
{
    private readonly IBudgetEntryService _service;

    public BudgetEntriesController(IBudgetEntryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetByVersion(int versionId, CancellationToken cancellationToken)
    {
        var result = await _service.GetByVersionAsync(versionId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Create(
        int versionId, [FromBody] CreateBudgetEntryRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(versionId, request, userId, cancellationToken);
        return Created($"api/v1/budget/versions/{versionId}/entries/{result.Id}", result);
    }

    [HttpPut("bulk")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> BulkUpsert(
        int versionId, [FromBody] BulkUpdateBudgetEntriesRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.BulkUpsertAsync(versionId, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Delete(
        int versionId, int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteAsync(versionId, id, userId, cancellationToken);
        return NoContent();
    }

    private int GetUserId() => this.GetRequiredUserId();
}
