using BudgetTracker.Application.Expenses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/expenses/{yearId:int}")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ExpenseEntriesController : ControllerBase
{
    private readonly IExpenseEntryService _service;

    public ExpenseEntriesController(IExpenseEntryService service)
    {
        _service = service;
    }

    [HttpGet("entries")]
    public async Task<IActionResult> GetEntries(
        int yearId, [FromQuery] int? versionId, CancellationToken cancellationToken)
    {
        if (!versionId.HasValue)
            return BadRequest(new { error = "versionId query parameter is required" });

        var result = await _service.GetByVersionAsync(versionId.Value, yearId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("entries")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Create(
        int yearId,
        [FromQuery] int? versionId,
        [FromBody] CreateExpenseEntryRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(yearId, versionId, request, userId, cancellationToken);
        return Created($"api/v1/expenses/{yearId}/entries/{result.Id}", result);
    }

    [HttpDelete("entries/{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteAsync(id, userId, cancellationToken);
        return NoContent();
    }

    private int GetUserId() => this.GetRequiredUserId();
}
