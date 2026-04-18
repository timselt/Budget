using BudgetTracker.Application.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/product-categories")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ProductCategoriesController : ControllerBase
{
    private readonly IProductCategoryService _service;

    public ProductCategoriesController(IProductCategoryService service)
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
        [FromBody] CreateProductCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Update(
        int id, [FromBody] UpdateProductCategoryRequest request, CancellationToken cancellationToken)
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

    private int GetUserId() => this.GetRequiredUserId();
}
