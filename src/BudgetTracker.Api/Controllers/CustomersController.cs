using BudgetTracker.Application.Customers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class CustomersController : ControllerBase
{
    private readonly ICustomerService _service;

    public CustomersController(ICustomerService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Update(
        int id, [FromBody] UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.UpdateAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteAsync(id, userId, cancellationToken);
        return NoContent();
    }

    // Mutabakat önkoşul #1 (00a §2.5) — dış müşteri kodu arama.
    // Bilinmeyen kod için 200 + null yerine 404 döner (spec §4).
    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup(
        [FromQuery(Name = "externalRef")] string externalRef,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalRef))
        {
            return BadRequest(new { error = "externalRef zorunlu." });
        }

        var match = await _service.LookupByExternalRefAsync(externalRef, cancellationToken);
        if (match is null) return NotFound();
        return Ok(match);
    }

    // Mutabakat önkoşul #1 (00a §2.5) — Logo/Mikro/Manuel kod bağlama.
    [HttpPost("{id:int}/link-external")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> LinkExternal(
        int id,
        [FromBody] LinkExternalCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.LinkExternalAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }

    private int GetUserId() => this.GetRequiredUserId();
}
