using BudgetTracker.Application.Calculations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard/{versionId:int}")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class DashboardController : ControllerBase
{
    private readonly IKpiCalculationEngine _kpiEngine;

    public DashboardController(IKpiCalculationEngine kpiEngine)
    {
        _kpiEngine = kpiEngine;
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis(
        int versionId,
        [FromQuery] int? segmentId,
        [FromQuery] int? monthFrom,
        [FromQuery] int? monthTo,
        CancellationToken cancellationToken)
    {
        var monthRange = (monthFrom.HasValue && monthTo.HasValue)
            ? new MonthRange(monthFrom.Value, monthTo.Value)
            : null;

        var result = await _kpiEngine.CalculateAsync(versionId, segmentId, monthRange, cancellationToken);
        return Ok(result);
    }

    [HttpGet("top-customers")]
    public async Task<IActionResult> GetTopCustomers(
        int versionId,
        [FromQuery] int topN = 10,
        CancellationToken cancellationToken = default)
    {
        var result = await _kpiEngine.CalculateConcentrationAsync(versionId, topN, cancellationToken);
        return Ok(result);
    }
}
