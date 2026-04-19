namespace BudgetTracker.Application.Authorization;

public sealed class SegregationOfDutiesGuard : ISegregationOfDutiesGuard
{
    public void EnsureDifferentActor(int creatorUserId, int approverUserId, string action)
    {
        if (creatorUserId == approverUserId)
        {
            throw new SegregationOfDutiesException(
                $"Görev ayrılığı ihlali: aynı kullanıcı '{action}' için hem yaratıcı hem onaylayıcı olamaz (userId={creatorUserId}).");
        }
    }
}
