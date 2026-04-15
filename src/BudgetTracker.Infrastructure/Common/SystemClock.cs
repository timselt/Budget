using BudgetTracker.Application.Common.Abstractions;

namespace BudgetTracker.Infrastructure.Common;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
