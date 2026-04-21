using BudgetTracker.Application.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Kontrat CRUD + revizyon + kod preview/parse endpoint'leri (ADR-0014).
/// </summary>
[ApiController]
[Route("api/v1/contracts")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ContractsController : ControllerBase
{
    private readonly IContractService _service;

    public ContractsController(IContractService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] int? productId,
        [FromQuery] string? flow,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(customerId, productId, flow, status, cancellationToken);
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
        [FromBody] CreateContractRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.CreateAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateContractRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.UpdateAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/revise")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> Revise(
        int id,
        [FromBody] ReviseContractRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.ReviseAsync(id, request, userId, cancellationToken);
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

    [HttpPost("{id:int}/activate")]
    [Authorize(Policy = "Contract.Manage")]
    public async Task<IActionResult> Activate(int id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.ActivateAsync(id, userId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/terminate")]
    [Authorize(Policy = "Contract.Manage")]
    public async Task<IActionResult> Terminate(
        int id,
        [FromBody] TerminateContractRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _service.TerminateAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("preview-code")]
    public async Task<IActionResult> PreviewCode(
        [FromBody] CreateContractRequest request, CancellationToken cancellationToken)
    {
        var code = await _service.PreviewCodeAsync(request, cancellationToken);
        return Ok(new { code });
    }

    [HttpGet("parse/{code}")]
    public IActionResult Parse(string code)
    {
        try
        {
            var breakdown = _service.ParseCode(code);
            return Ok(breakdown);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int GetUserId() => this.GetRequiredUserId();
}
