using BudgetTracker.Application.Audit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize(
    AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme,
    Policy = "Admin")]
public sealed class AuditController : ControllerBase
{
    private readonly IAuditQueryService _auditQueryService;

    public AuditController(IAuditQueryService auditQueryService)
    {
        _auditQueryService = auditQueryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int? userId,
        [FromQuery] string? entityType,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var query = new AuditLogQuery(
            UserId: userId,
            EntityType: entityType,
            DateFrom: from,
            DateTo: to,
            Page: page,
            Limit: limit);

        var result = await _auditQueryService.GetAuditLogsAsync(query, cancellationToken);
        return Ok(result);
    }
}
