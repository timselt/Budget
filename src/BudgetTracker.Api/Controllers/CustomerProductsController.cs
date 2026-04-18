using BudgetTracker.Application.CustomerProducts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/customers/{customerId:int}/products")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class CustomerProductsController : ControllerBase
{
    private readonly ICustomerProductService _service;

    public CustomerProductsController(ICustomerProductService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetByCustomer(
        int customerId,
        [FromQuery] bool? onlyActive,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByCustomerAsync(customerId, onlyActive, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int customerId, int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(customerId, id, cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Create(
        int customerId,
        [FromBody] CreateCustomerProductRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(customerId, request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById),
            new { customerId, id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Update(
        int customerId, int id,
        [FromBody] UpdateCustomerProductRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.UpdateAsync(customerId, id, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Delete(int customerId, int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _service.DeleteAsync(customerId, id, userId, cancellationToken);
        return NoContent();
    }

    private int GetUserId() =>
        int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new InvalidOperationException("User ID claim not found"));
}
