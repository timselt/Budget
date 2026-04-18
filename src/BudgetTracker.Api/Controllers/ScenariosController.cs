using BudgetTracker.Application.Scenarios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/scenarios")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ScenariosController : ControllerBase
{
    private readonly IScenarioService _service;

    public ScenariosController(IScenarioService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int versionId, CancellationToken cancellationToken)
    {
        var result = await _service.GetScenariosAsync(versionId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateScenarioRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateScenarioAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { versionId = result.BudgetVersionId }, result);
    }

    [HttpGet("{id:int}/pnl")]
    public async Task<IActionResult> GetPnl(
        int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetScenarioPnlAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteScenarioAsync(id, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("compare")]
    public async Task<IActionResult> Compare(
        [FromBody] CompareRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CompareScenariosAsync(request.ScenarioIds, cancellationToken);
        return Ok(result);
    }

    private int GetUserId() => this.GetRequiredUserId();
}

public sealed record CompareRequest(int[] ScenarioIds);
