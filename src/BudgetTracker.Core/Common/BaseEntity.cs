namespace BudgetTracker.Core.Common;

public abstract class BaseEntity
{
    public int Id { get; protected set; }
    public DateTimeOffset CreatedAt { get; protected set; }
    public int? CreatedByUserId { get; protected set; }
    public DateTimeOffset? UpdatedAt { get; protected set; }
    public int? UpdatedByUserId { get; protected set; }
    public DateTimeOffset? DeletedAt { get; protected set; }
    public int? DeletedByUserId { get; protected set; }

    public bool IsDeleted => DeletedAt is not null;

    public void MarkDeleted(int actorUserId, DateTimeOffset deletedAt)
    {
        if (IsDeleted)
        {
            return;
        }
        DeletedAt = deletedAt;
        DeletedByUserId = actorUserId;
    }
}
