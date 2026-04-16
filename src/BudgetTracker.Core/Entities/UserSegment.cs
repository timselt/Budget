namespace BudgetTracker.Core.Entities;

public sealed class UserSegment
{
    public int UserId { get; private set; }
    public int SegmentId { get; private set; }
    public bool CanEdit { get; private set; }

    private UserSegment() { }

    public static UserSegment Create(int userId, int segmentId, bool canEdit = false)
    {
        if (userId <= 0) throw new ArgumentOutOfRangeException(nameof(userId));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));

        return new UserSegment
        {
            UserId = userId,
            SegmentId = segmentId,
            CanEdit = canEdit
        };
    }

    public void SetCanEdit(bool canEdit) => CanEdit = canEdit;
}
