using BudgetTracker.Application.Common.Abstractions;

namespace BudgetTracker.IntegrationTests.Fixtures;

internal sealed class FixedClock : IClock
{
    public FixedClock(DateTimeOffset now) => UtcNow = now;

    public DateTimeOffset UtcNow { get; }
}
