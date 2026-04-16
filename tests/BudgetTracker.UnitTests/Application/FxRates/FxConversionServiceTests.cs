using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using BudgetTracker.Infrastructure.FxRates;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using MockQueryable.NSubstitute;
using NSubstitute;

namespace BudgetTracker.UnitTests.Application.FxRates;

public sealed class FxConversionServiceTests
{
    private static IApplicationDbContext CreateDb(IEnumerable<FxRate> rates)
    {
        var db = Substitute.For<IApplicationDbContext>();
        var mockDbSet = rates.AsQueryable().BuildMockDbSet();
        db.FxRates.Returns(mockDbSet);
        return db;
    }

    [Fact]
    public async Task ConvertToTry_WhenCurrencyIsTry_ReturnsPassthrough()
    {
        var db = CreateDb([]);
        var sut = new FxConversionService(db);

        var result = await sut.ConvertToTryAsync(50_000m, "TRY", 2026, 3, CancellationToken.None);

        result.AmountTryFixed.Should().Be(50_000m);
        result.AmountTrySpot.Should().Be(50_000m);
        result.FixedRate.Should().Be(1m);
        result.SpotRate.Should().Be(1m);
    }

    [Fact]
    public async Task ConvertToTry_WhenCurrencyIsUsd_UsesRates()
    {
        var rates = new[]
        {
            FxRate.Create("USD", new DateOnly(2026, 1, 2), 32.50m, FxRateSource.Tcmb, true, DateTimeOffset.UtcNow),
            FxRate.Create("USD", new DateOnly(2026, 3, 31), 33.75m, FxRateSource.Tcmb, false, DateTimeOffset.UtcNow),
        };
        var db = CreateDb(rates);
        var sut = new FxConversionService(db);

        var result = await sut.ConvertToTryAsync(1_000m, "USD", 2026, 3, CancellationToken.None);

        result.FixedRate.Should().Be(32.50m);
        result.SpotRate.Should().Be(33.75m);
        result.AmountTryFixed.Should().Be(32_500m);
        result.AmountTrySpot.Should().Be(33_750m);
    }

    [Fact]
    public async Task ConvertToTry_UsesBankersRounding()
    {
        var rates = new[]
        {
            FxRate.Create("EUR", new DateOnly(2026, 1, 2), 35.125m, FxRateSource.Tcmb, true, DateTimeOffset.UtcNow),
            FxRate.Create("EUR", new DateOnly(2026, 6, 30), 35.125m, FxRateSource.Tcmb, false, DateTimeOffset.UtcNow),
        };
        var db = CreateDb(rates);
        var sut = new FxConversionService(db);

        var result = await sut.ConvertToTryAsync(100m, "EUR", 2026, 6, CancellationToken.None);

        result.AmountTryFixed.Should().Be(3512.50m);
    }

    [Fact]
    public async Task ConvertToTry_WhenNoRateFound_Throws()
    {
        var db = CreateDb([]);
        var sut = new FxConversionService(db);

        var act = () => sut.ConvertToTryAsync(1_000m, "GBP", 2026, 1, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*No FX rate found*");
    }

    [Fact]
    public async Task GetRateAsync_FallsBackToPreviousDate()
    {
        var rates = new[]
        {
            FxRate.Create("USD", new DateOnly(2026, 3, 28), 33.00m, FxRateSource.Tcmb, false, DateTimeOffset.UtcNow),
        };
        var db = CreateDb(rates);
        var sut = new FxConversionService(db);

        var rate = await sut.GetRateAsync("USD", new DateOnly(2026, 3, 31), CancellationToken.None);

        rate.Should().Be(33.00m);
    }
}
