using BudgetTracker.Application.Variance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/variance/{versionId:int}")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class VarianceController : ControllerBase
{
    private readonly IVarianceService _varianceService;

    public VarianceController(IVarianceService varianceService)
    {
        _varianceService = varianceService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        int versionId,
        CancellationToken cancellationToken)
    {
        var result = await _varianceService.GetVarianceSummaryAsync(versionId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers(
        int versionId,
        CancellationToken cancellationToken)
    {
        var result = await _varianceService.GetCustomerVarianceAsync(versionId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("heatmap")]
    public async Task<IActionResult> GetHeatmap(
        int versionId,
        CancellationToken cancellationToken)
    {
        var result = await _varianceService.GetVarianceHeatmapAsync(versionId, cancellationToken);
        return Ok(result);
    }
}
