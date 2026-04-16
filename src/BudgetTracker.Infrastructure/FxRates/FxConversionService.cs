using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.FxRates;

public sealed class FxConversionService : IFxConversionService
{
    private readonly IApplicationDbContext _db;

    public FxConversionService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<FxConversionResult> ConvertToTryAsync(
        decimal amountOriginal,
        string currencyCode,
        int budgetYear,
        int month,
        CancellationToken cancellationToken)
    {
        if (currencyCode == "TRY")
        {
            return new FxConversionResult(amountOriginal, amountOriginal, 1m, 1m);
        }

        var fixedRate = await GetFixedRateAsync(currencyCode, budgetYear, cancellationToken);
        var spotRate = await GetSpotRateAsync(currencyCode, budgetYear, month, cancellationToken);

        var amountTryFixed = Round(amountOriginal * fixedRate);
        var amountTrySpot = Round(amountOriginal * spotRate);

        return new FxConversionResult(amountTryFixed, amountTrySpot, fixedRate, spotRate);
    }

    public async Task<decimal> GetRateAsync(
        string currencyCode,
        DateOnly rateDate,
        CancellationToken cancellationToken)
    {
        if (currencyCode == "TRY") return 1m;

        var rate = await _db.FxRates
            .Where(r => r.CurrencyCode == currencyCode && r.RateDate <= rateDate)
            .OrderByDescending(r => r.RateDate)
            .Select(r => (decimal?)r.RateValue)
            .FirstOrDefaultAsync(cancellationToken);

        return rate ?? throw new InvalidOperationException(
            $"No FX rate found for {currencyCode} on or before {rateDate}");
    }

    private async Task<decimal> GetFixedRateAsync(
        string currencyCode, int budgetYear, CancellationToken cancellationToken)
    {
        var rate = await _db.FxRates
            .Where(r => r.CurrencyCode == currencyCode && r.IsYearStartFixed)
            .Where(r => r.RateDate.Year == budgetYear)
            .Select(r => (decimal?)r.RateValue)
            .FirstOrDefaultAsync(cancellationToken);

        if (rate.HasValue) return rate.Value;

        var yearStart = new DateOnly(budgetYear, 1, 1);
        return await GetRateAsync(currencyCode, yearStart, cancellationToken);
    }

    private async Task<decimal> GetSpotRateAsync(
        string currencyCode, int budgetYear, int month, CancellationToken cancellationToken)
    {
        var lastDayOfMonth = new DateOnly(budgetYear, month, DateTime.DaysInMonth(budgetYear, month));
        return await GetRateAsync(currencyCode, lastDayOfMonth, cancellationToken);
    }

    private static decimal Round(decimal value) =>
        Math.Round(value, 2, MidpointRounding.ToEven);
}
