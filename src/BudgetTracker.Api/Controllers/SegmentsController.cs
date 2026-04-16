using BudgetTracker.Application.Calculations;
using BudgetTracker.Application.Common.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/segments")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class SegmentsController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly IKpiCalculationEngine _kpiEngine;

    public SegmentsController(IApplicationDbContext db, IKpiCalculationEngine kpiEngine)
    {
        _db = db;
        _kpiEngine = kpiEngine;
    }

    public sealed record SegmentDto(int Id, string Code, string Name, int DisplayOrder, bool IsActive);

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var segments = await _db.Segments
            .OrderBy(s => s.DisplayOrder)
            .Select(s => new SegmentDto(s.Id, s.Code, s.Name, s.DisplayOrder, s.IsActive))
            .ToListAsync(cancellationToken);
        return Ok(segments);
    }

    [HttpGet("{id:int}/performance")]
    public async Task<IActionResult> GetPerformance(
        int id,
        [FromQuery] int versionId,
        [FromQuery] int? monthFrom,
        [FromQuery] int? monthTo,
        CancellationToken cancellationToken)
    {
        var monthRange = (monthFrom.HasValue && monthTo.HasValue)
            ? new MonthRange(monthFrom.Value, monthTo.Value)
            : null;

        var result = await _kpiEngine.CalculateAsync(versionId, id, monthRange, cancellationToken);
        return Ok(result);
    }
}
