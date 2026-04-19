using BudgetTracker.Application.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Fiyat arama endpoint'i (00b §3.3). Mutabakat import parser'ı bu endpoint'i
/// her satır için çağırır; SLA p95 &lt; 5ms (IMemoryCache).
/// </summary>
[ApiController]
[Route("api/v1/pricing")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class PricingController : ControllerBase
{
    private readonly IPricingLookupService _lookup;

    public PricingController(IPricingLookupService lookup)
    {
        _lookup = lookup;
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup(
        [FromQuery(Name = "customer_id")] int customerId,
        [FromQuery] string flow,
        [FromQuery(Name = "period_code")] string periodCode,
        [FromQuery(Name = "product_code")] string productCode,
        [FromQuery(Name = "expected_unit_price")] decimal? expectedUnitPrice,
        CancellationToken cancellationToken)
    {
        var result = await _lookup.LookupAsync(
            customerId, flow, periodCode, productCode, expectedUnitPrice, cancellationToken);
        return Ok(result);
    }
}
