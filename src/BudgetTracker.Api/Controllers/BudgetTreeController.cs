using System.Security.Claims;
using BudgetTracker.Application.BudgetOperations;
using BudgetTracker.Application.BudgetTree;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Bütçe planlama sayfası (BudgetEntryPage) için tree agregasyon + müşteri
/// özet + hızlı işlem (kopyala/büyüt) endpoint'leri.
/// </summary>
[ApiController]
[Route("api/v1/budget/versions/{versionId:int}")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class BudgetTreeController : ControllerBase
{
    private readonly IBudgetTreeService _tree;
    private readonly IBudgetOperationsService _operations;

    public BudgetTreeController(
        IBudgetTreeService tree,
        IBudgetOperationsService operations)
    {
        _tree = tree;
        _operations = operations;
    }

    [HttpGet("tree")]
    public async Task<IActionResult> GetTree(int versionId, CancellationToken cancellationToken)
    {
        var result = await _tree.GetAsync(versionId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("customers/{customerId:int}/summary")]
    public async Task<IActionResult> GetCustomerSummary(
        int versionId, int customerId, CancellationToken cancellationToken)
    {
        var result = await _tree.GetCustomerSummaryAsync(
            customerId, versionId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("copy-from-year")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CopyFromYear(
        int versionId,
        [FromBody] CopyFromYearRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _operations.CopyFromYearAsync(
            versionId, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("grow-by-percent")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> GrowByPercent(
        int versionId,
        [FromBody] GrowByPercentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _operations.GrowByPercentAsync(
            versionId, request, userId, cancellationToken);
        return Ok(result);
    }

    private int GetUserId() => this.GetRequiredUserId();
}
