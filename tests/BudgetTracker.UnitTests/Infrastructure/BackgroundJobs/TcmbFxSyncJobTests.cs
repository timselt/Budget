using BudgetTracker.Application.BackgroundJobs;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Infrastructure.BackgroundJobs;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace BudgetTracker.UnitTests.Infrastructure.BackgroundJobs;

public sealed class TcmbFxSyncJobTests
{
    private static readonly DateTimeOffset Monday = new(2026, 4, 20, 12, 0, 0, TimeSpan.Zero);

    private static IOptions<TcmbFxSyncOptions> FastOptions() =>
        Options.Create(new TcmbFxSyncOptions
        {
            MaxRetryAttempts = 3,
            InitialRetryDelay = TimeSpan.FromMilliseconds(1),
        });

    [Fact]
    public async Task ExecuteAsync_WhenFirstAttemptSucceeds_DoesNotRetryOrFallback()
    {
        // Arrange
        var tcmb = Substitute.For<ITcmbFxService>();
        tcmb.SyncRatesAsync(Arg.Any<DateOnly>(), Arg.Any<CancellationToken>()).Returns(3);
        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Monday);

        var sut = new TcmbFxSyncJob(tcmb, clock, FastOptions(), NullLogger<TcmbFxSyncJob>.Instance);

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert
        await tcmb.Received(1).SyncRatesAsync(new DateOnly(2026, 4, 20), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_WhenTransientFailures_RetriesThenSucceeds()
    {
        // Arrange — first 2 calls fail, 3rd succeeds (within MaxRetryAttempts=3).
        var tcmb = Substitute.For<ITcmbFxService>();
        tcmb.SyncRatesAsync(Arg.Any<DateOnly>(), Arg.Any<CancellationToken>())
            .Returns(
                _ => throw new HttpRequestException("TCMB unavailable"),
                _ => throw new HttpRequestException("TCMB still unavailable"),
                _ => Task.FromResult(3));

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Monday);

        var sut = new TcmbFxSyncJob(tcmb, clock, FastOptions(), NullLogger<TcmbFxSyncJob>.Instance);

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert — 3 total calls on the target date (1 initial + 2 retries), no fallback.
        await tcmb.Received(3).SyncRatesAsync(new DateOnly(2026, 4, 20), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_WhenAllRetriesExhausted_FallsBackToPreviousBusinessDay()
    {
        // Arrange — target date always fails; fallback succeeds.
        var tcmb = Substitute.For<ITcmbFxService>();
        tcmb.SyncRatesAsync(new DateOnly(2026, 4, 20), Arg.Any<CancellationToken>())
            .Throws(new HttpRequestException("TCMB down"));
        tcmb.SyncRatesAsync(new DateOnly(2026, 4, 17), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(3));

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Monday);

        var sut = new TcmbFxSyncJob(tcmb, clock, FastOptions(), NullLogger<TcmbFxSyncJob>.Instance);

        // Act
        await sut.ExecuteAsync(CancellationToken.None);

        // Assert — 4 attempts on target (1 + 3 retries) + 1 fallback on previous business day.
        await tcmb.Received(4).SyncRatesAsync(new DateOnly(2026, 4, 20), Arg.Any<CancellationToken>());
        await tcmb.Received(1).SyncRatesAsync(new DateOnly(2026, 4, 17), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_WhenFallbackAlsoFails_PropagatesException()
    {
        // Arrange — target fails, fallback also fails → job fails; Hangfire will record it.
        var tcmb = Substitute.For<ITcmbFxService>();
        tcmb.SyncRatesAsync(Arg.Any<DateOnly>(), Arg.Any<CancellationToken>())
            .Throws(new HttpRequestException("completely down"));

        var clock = Substitute.For<IClock>();
        clock.UtcNow.Returns(Monday);

        var sut = new TcmbFxSyncJob(tcmb, clock, FastOptions(), NullLogger<TcmbFxSyncJob>.Instance);

        // Act
        var act = async () => await sut.ExecuteAsync(CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Theory]
    [InlineData(2026, 4, 20, 2026, 4, 17)] // Monday    → Friday
    [InlineData(2026, 4, 21, 2026, 4, 20)] // Tuesday   → Monday
    [InlineData(2026, 4, 18, 2026, 4, 17)] // Saturday  → Friday
    [InlineData(2026, 4, 19, 2026, 4, 17)] // Sunday    → Friday
    public void PreviousBusinessDay_SkipsWeekends(int y1, int m1, int d1, int y2, int m2, int d2)
    {
        TcmbFxSyncJob.PreviousBusinessDay(new DateOnly(y1, m1, d1))
            .Should().Be(new DateOnly(y2, m2, d2));
    }
}
