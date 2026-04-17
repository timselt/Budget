using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.Infrastructure.FxRates;
using FluentAssertions;
using MockQueryable.NSubstitute;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace BudgetTracker.UnitTests.Infrastructure.FxRates;

public sealed class TcmbFxServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 16, 15, 45, 0, TimeSpan.Zero);

    [Fact]
    public async Task SyncRatesAsync_WhenAlreadySynced_ReturnsZero()
    {
        var existingRates = new List<FxRate>
        {
            FxRate.Create("USD", new DateOnly(2026, 4, 16), 38.5m, FxRateSource.Tcmb, false, Now),
            FxRate.Create("EUR", new DateOnly(2026, 4, 16), 42.1m, FxRateSource.Tcmb, false, Now),
            FxRate.Create("GBP", new DateOnly(2026, 4, 16), 48.3m, FxRateSource.Tcmb, false, Now),
        };

        var db = CreateDb(existingRates);
        var httpFactory = Substitute.For<IHttpClientFactory>();
        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Now);

        var sut = new TcmbFxService(db, httpFactory, clock, NullLogger<TcmbFxService>.Instance);

        var result = await sut.SyncRatesAsync(new DateOnly(2026, 4, 16), CancellationToken.None);

        result.Should().Be(0);
    }

    [Fact]
    public async Task SyncRatesAsync_WhenHttpReturnsNonSuccess_ThrowsHttpRequestException()
    {
        // TCMB returns 404 for non-business days. The job wrapper (TcmbFxSyncJob) relies on
        // this exception to trigger Polly retry + previous-business-day fallback. Swallowing
        // to 0 would be a silent failure.
        var db = CreateDb([]);
        var httpFactory = Substitute.For<IHttpClientFactory>();

        var handler = new FakeHttpHandler(new HttpResponseMessage(System.Net.HttpStatusCode.NotFound));
        var client = new HttpClient(handler);
        httpFactory.CreateClient("tcmb").Returns(client);

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Now);

        var sut = new TcmbFxService(db, httpFactory, clock, NullLogger<TcmbFxService>.Instance);

        var act = async () => await sut.SyncRatesAsync(new DateOnly(2026, 4, 16), CancellationToken.None);

        (await act.Should().ThrowAsync<HttpRequestException>())
            .Which.StatusCode.Should().Be(System.Net.HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SyncRatesAsync_WhenXmlIsMalformed_ThrowsInvalidOperationException()
    {
        // Silent-failure guard: CLAUDE.md §Bilinen Tuzaklar #3 (TCMB XML drift) forbids
        // swallowing parse errors. This test locks in the throwing behaviour.
        var db = CreateDb([]);
        var httpFactory = Substitute.For<IHttpClientFactory>();

        var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent("<not-xml>", System.Text.Encoding.UTF8, "application/xml"),
        };
        var handler = new FakeHttpHandler(response);
        var client = new HttpClient(handler);
        httpFactory.CreateClient("tcmb").Returns(client);

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Now);

        var sut = new TcmbFxService(db, httpFactory, clock, NullLogger<TcmbFxService>.Instance);

        var act = async () => await sut.SyncRatesAsync(new DateOnly(2026, 4, 16), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*XML*drifted*");
    }

    [Fact]
    public async Task SyncRatesAsync_WhenRateIsNotDecimal_ThrowsInvalidOperationException()
    {
        var db = CreateDb([]);
        var httpFactory = Substitute.For<IHttpClientFactory>();

        var xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <Tarih_Date>
              <Currency CurrencyCode="USD">
                <ForexBuying>not-a-number</ForexBuying>
                <ForexSelling>38.6000</ForexSelling>
              </Currency>
            </Tarih_Date>
            """;
        var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent(xml, System.Text.Encoding.UTF8, "application/xml"),
        };
        var handler = new FakeHttpHandler(response);
        var client = new HttpClient(handler);
        httpFactory.CreateClient("tcmb").Returns(client);

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Now);

        var sut = new TcmbFxService(db, httpFactory, clock, NullLogger<TcmbFxService>.Instance);

        var act = async () => await sut.SyncRatesAsync(new DateOnly(2026, 4, 16), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SyncRatesAsync_WithValidXml_ParsesAndSavesRates()
    {
        var db = CreateDb([]);
        var httpFactory = Substitute.For<IHttpClientFactory>();

        var xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <Tarih_Date Tarih="16.04.2026" Date="04/16/2026">
              <Currency CurrencyCode="USD">
                <ForexBuying>38.4000</ForexBuying>
                <ForexSelling>38.6000</ForexSelling>
              </Currency>
              <Currency CurrencyCode="EUR">
                <ForexBuying>42.0000</ForexBuying>
                <ForexSelling>42.2000</ForexSelling>
              </Currency>
              <Currency CurrencyCode="JPY">
                <ForexBuying>0.2500</ForexBuying>
                <ForexSelling>0.2600</ForexSelling>
              </Currency>
            </Tarih_Date>
            """;
        var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent(xml, System.Text.Encoding.UTF8, "application/xml")
        };
        var handler = new FakeHttpHandler(response);
        var client = new HttpClient(handler);
        httpFactory.CreateClient("tcmb").Returns(client);

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Now);

        var sut = new TcmbFxService(db, httpFactory, clock, NullLogger<TcmbFxService>.Instance);

        var result = await sut.SyncRatesAsync(new DateOnly(2026, 4, 16), CancellationToken.None);

        // USD + EUR synced; JPY not tracked
        result.Should().Be(2);
        db.FxRates.Received().Add(Arg.Is<FxRate>(r => r.CurrencyCode == "USD"));
        db.FxRates.Received().Add(Arg.Is<FxRate>(r => r.CurrencyCode == "EUR"));
    }

    private static IApplicationDbContext CreateDb(List<FxRate> rates)
    {
        var mockRates = rates.AsQueryable().BuildMockDbSet();
        var db = Substitute.For<IApplicationDbContext>();
        db.FxRates.Returns(mockRates);
        return db;
    }

    private sealed class FakeHttpHandler : HttpMessageHandler
    {
        private readonly HttpResponseMessage _response;
        public FakeHttpHandler(HttpResponseMessage response) => _response = response;
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_response);
    }
}
