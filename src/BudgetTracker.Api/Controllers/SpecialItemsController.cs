using BudgetTracker.Application.SpecialItems;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/special-items/{yearId:int}")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class SpecialItemsController : ControllerBase
{
    private readonly ISpecialItemService _service;

    public SpecialItemsController(ISpecialItemService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetByVersion(
        int yearId, [FromQuery] int? versionId, CancellationToken cancellationToken)
    {
        var result = await _service.GetByVersionAsync(yearId, versionId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Create(
        int yearId,
        [FromQuery] int? versionId,
        [FromBody] CreateSpecialItemRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(yearId, versionId, request, userId, cancellationToken);
        return Created($"api/v1/special-items/{yearId}/{result.Id}", result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteAsync(id, userId, cancellationToken);
        return NoContent();
    }

    private int GetUserId() =>
        int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("User ID claim not found"));
}
