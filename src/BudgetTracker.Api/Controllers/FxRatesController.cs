using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/fx/rates")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class FxRatesController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly ITcmbFxService _tcmb;

    public FxRatesController(IApplicationDbContext db, IClock clock, ITcmbFxService tcmb)
    {
        _db = db;
        _clock = clock;
        _tcmb = tcmb;
    }

    public sealed record FxRateDto(
        int Id, string CurrencyCode, DateOnly RateDate,
        decimal RateValue, string Source, bool IsYearStartFixed);
    public sealed record ManualRateRequest(
        string CurrencyCode, DateOnly RateDate,
        decimal RateValue, bool IsYearStartFixed);

    [HttpGet]
    public async Task<IActionResult> GetRates(
        [FromQuery] DateOnly? date,
        [FromQuery] string? currency,
        CancellationToken cancellationToken)
    {
        var query = _db.FxRates.AsQueryable();

        if (date.HasValue)
        {
            query = query.Where(r => r.RateDate == date.Value);
        }

        if (!string.IsNullOrWhiteSpace(currency))
        {
            query = query.Where(r => r.CurrencyCode == currency.ToUpperInvariant());
        }

        var rates = await query
            .OrderByDescending(r => r.RateDate)
            .ThenBy(r => r.CurrencyCode)
            .Take(100)
            .Select(r => new FxRateDto(
                r.Id, r.CurrencyCode, r.RateDate,
                r.RateValue, r.Source.ToString().ToUpperInvariant(),
                r.IsYearStartFixed))
            .ToListAsync(cancellationToken);

        return Ok(rates);
    }

    [HttpPost("manual")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CreateManual(
        [FromBody] ManualRateRequest request, CancellationToken cancellationToken)
    {
        var rate = FxRate.Create(
            request.CurrencyCode.ToUpperInvariant(),
            request.RateDate,
            request.RateValue,
            FxRateSource.Manual,
            request.IsYearStartFixed,
            _clock.UtcNow);

        _db.FxRates.Add(rate);
        await _db.SaveChangesAsync(cancellationToken);

        return Created($"api/v1/fx/rates/{rate.Id}",
            new FxRateDto(rate.Id, rate.CurrencyCode, rate.RateDate,
                rate.RateValue, "MANUAL", rate.IsYearStartFixed));
    }

    [HttpPost("sync")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> SyncTcmb(
        [FromQuery] DateOnly? date, CancellationToken cancellationToken)
    {
        var targetDate = date ?? DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime);
        var synced = await _tcmb.SyncRatesAsync(targetDate, cancellationToken);
        return Ok(new { date = targetDate, syncedCount = synced });
    }
}
