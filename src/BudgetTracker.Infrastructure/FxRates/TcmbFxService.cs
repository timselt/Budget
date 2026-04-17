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

        // Network-level failures (DNS, timeout, reset) propagate as HttpRequestException.
        // Non-2xx responses are re-thrown as HttpRequestException with the status code
        // attached so the recurring-job wrapper can apply Polly retry + previous-business-day
        // fallback. Swallowing to 0 would be a silent failure and violate CLAUDE.md §Bilinen
        // Tuzaklar #3 (TCMB XML drift / fallback requirement).
        var response = await client.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"TCMB returned {(int)response.StatusCode} {response.StatusCode} for {date:yyyy-MM-dd}",
                inner: null,
                statusCode: response.StatusCode);
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
        // XML / decimal parse failures propagate as InvalidOperationException so the
        // caller (TcmbFxSyncJob) can see a schema drift and surface it via Hangfire
        // failure + Seq alert. Swallowing these would be a silent failure — the exact
        // scenario CLAUDE.md §Bilinen Tuzaklar #3 (TCMB XML drift) warns against.
        var rates = new List<FxRate>();
        XDocument doc;
        try
        {
            doc = XDocument.Parse(xml);
        }
        catch (System.Xml.XmlException ex)
        {
            _logger.LogError(ex, "TCMB XML parse failed for {Date}", date);
            throw new InvalidOperationException(
                $"TCMB XML for {date:yyyy-MM-dd} is malformed; upstream contract may have drifted.",
                ex);
        }

        foreach (var currency in doc.Descendants("Currency"))
        {
            var code = currency.Attribute("CurrencyCode")?.Value;
            if (code is null || !TrackedCurrencies.Contains(code)) continue;

            var forexBuyingStr = currency.Element("ForexBuying")?.Value;
            var forexSellingStr = currency.Element("ForexSelling")?.Value;

            if (string.IsNullOrWhiteSpace(forexBuyingStr) || string.IsNullOrWhiteSpace(forexSellingStr))
                continue;

            if (!decimal.TryParse(forexBuyingStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var buying)
                || !decimal.TryParse(forexSellingStr, NumberStyles.Number, CultureInfo.InvariantCulture, out var selling))
            {
                throw new InvalidOperationException(
                    $"TCMB rate for {code} on {date:yyyy-MM-dd} is not a valid decimal " +
                    $"(buying='{forexBuyingStr}', selling='{forexSellingStr}').");
            }

            var midRate = Math.Round((buying + selling) / 2m, 4, MidpointRounding.ToEven);
            rates.Add(FxRate.Create(code, date, midRate, FxRateSource.Tcmb, false, _clock.UtcNow));
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
