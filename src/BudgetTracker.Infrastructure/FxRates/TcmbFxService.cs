using System.Globalization;
using System.Xml.Linq;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.FxRates;

public sealed class TcmbFxService : ITcmbFxService
{
    private const string TcmbUrl = "https://www.tcmb.gov.tr/kurlar/{0}/{1}.xml";

    private readonly IApplicationDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IClock _clock;
    private readonly ILogger<TcmbFxService> _logger;

    private static readonly HashSet<string> TrackedCurrencies = ["USD", "EUR", "GBP"];

    public TcmbFxService(
        IApplicationDbContext db,
        IHttpClientFactory httpClientFactory,
        IClock clock,
        ILogger<TcmbFxService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _clock = clock;
        _logger = logger;
    }

    public async Task<int> SyncRatesAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var existingCount = await _db.FxRates
            .CountAsync(r => r.RateDate == date && r.Source == FxRateSource.Tcmb, cancellationToken);

        if (existingCount >= TrackedCurrencies.Count)
        {
            _logger.LogInformation("TCMB rates for {Date} already synced, skipping", date);
            return 0;
        }

        var url = BuildUrl(date);
        var client = _httpClientFactory.CreateClient("tcmb");

        HttpResponseMessage response;
        try
        {
            response = await client.GetAsync(url, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "TCMB request failed for {Date}, trying previous day", date);
            return 0;
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("TCMB returned {StatusCode} for {Date}", response.StatusCode, date);
            return 0;
        }

        var xml = await response.Content.ReadAsStringAsync(cancellationToken);
        var rates = ParseTcmbXml(xml, date);

        var synced = 0;
        foreach (var rate in rates)
        {
            var exists = await _db.FxRates
                .AnyAsync(r => r.CurrencyCode == rate.CurrencyCode
                    && r.RateDate == rate.RateDate
                    && r.Source == FxRateSource.Tcmb, cancellationToken);

            if (exists) continue;

            _db.FxRates.Add(rate);
            synced++;
        }

        if (synced > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Synced {Count} TCMB rates for {Date}", synced, date);
        }

        return synced;
    }

    private List<FxRate> ParseTcmbXml(string xml, DateOnly date)
    {
        var rates = new List<FxRate>();
        try
        {
            var doc = XDocument.Parse(xml);
            var currencies = doc.Descendants("Currency");

            foreach (var currency in currencies)
            {
                var code = currency.Attribute("CurrencyCode")?.Value;
                if (code is null || !TrackedCurrencies.Contains(code)) continue;

                var forexBuyingStr = currency.Element("ForexBuying")?.Value;
                var forexSellingStr = currency.Element("ForexSelling")?.Value;

                if (string.IsNullOrWhiteSpace(forexBuyingStr) || string.IsNullOrWhiteSpace(forexSellingStr))
                    continue;

                var buying = decimal.Parse(forexBuyingStr, CultureInfo.InvariantCulture);
                var selling = decimal.Parse(forexSellingStr, CultureInfo.InvariantCulture);
                var midRate = Math.Round((buying + selling) / 2m, 4, MidpointRounding.ToEven);

                rates.Add(FxRate.Create(code, date, midRate, FxRateSource.Tcmb, false, _clock.UtcNow));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse TCMB XML for {Date}", date);
        }

        return rates;
    }

    private static string BuildUrl(DateOnly date)
    {
        var yearMonth = date.ToString("yyyyMM", CultureInfo.InvariantCulture);
        var dayMonth = date.ToString("ddMMyyyy", CultureInfo.InvariantCulture);
        return string.Format(TcmbUrl, yearMonth, dayMonth);
    }
}
