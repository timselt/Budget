namespace BudgetTracker.Application.Common.Abstractions;

public interface ICurrentUser
{
    int? UserId { get; }
    bool IsAuthenticated { get; }
}
