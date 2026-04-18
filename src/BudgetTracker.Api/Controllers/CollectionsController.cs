using BudgetTracker.Application.Collections;
using BudgetTracker.Core.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/collections")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class CollectionsController : ControllerBase
{
    private readonly ICollectionImportService _importService;
    private readonly ICollectionCalculationService _calculationService;
    private readonly ICollectionQueryService _queryService;
    private readonly ITenantContext _tenantContext;

    public CollectionsController(
        ICollectionImportService importService,
        ICollectionCalculationService calculationService,
        ICollectionQueryService queryService,
        ITenantContext tenantContext)
    {
        _importService = importService;
        _calculationService = calculationService;
        _queryService = queryService;
        _tenantContext = tenantContext;
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import(
        IFormFile file,
        [FromForm] int segmentId,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest("Dosya bos olamaz.");
        }

        var companyId = GetCompanyId();
        var userId = GetUserId();

        await using var stream = file.OpenReadStream();
        var result = await _importService.ImportAsync(
            stream, file.FileName, segmentId, companyId, userId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("dashboard/consolidated")]
    public async Task<IActionResult> GetConsolidatedDashboard(
        [FromQuery] int? periodId,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var result = await _calculationService.GetConsolidatedDashboardAsync(
            companyId, periodId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("dashboard/segment/{segmentId:int}")]
    public async Task<IActionResult> GetSegmentDashboard(
        int segmentId,
        [FromQuery] int? periodId,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var result = await _calculationService.GetSegmentDashboardAsync(
            companyId, segmentId, periodId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("customers/{customerId:int}/invoices")]
    public async Task<IActionResult> GetCustomerInvoices(
        int customerId,
        [FromQuery] int? periodId,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var result = await _calculationService.GetCustomerInvoicesAsync(
            companyId, customerId, periodId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("periods")]
    public async Task<IActionResult> GetPeriods(
        [FromQuery] int? segmentId,
        CancellationToken cancellationToken)
    {
        var companyId = GetCompanyId();
        var result = await _queryService.GetPeriodsAsync(
            companyId, segmentId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("top-overdue")]
    public async Task<IActionResult> GetTopOverdue(
        [FromQuery] int n = 10,
        [FromQuery] int? periodId = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetCompanyId();
        var result = await _queryService.GetTopOverdueAsync(
            companyId, n, periodId, cancellationToken);

        return Ok(result);
    }

    private int GetCompanyId() =>
        _tenantContext.CurrentCompanyId
        ?? throw new InvalidOperationException("Company context is not available");

    private int GetUserId() => this.GetRequiredUserId();
}
