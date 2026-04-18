namespace BudgetTracker.Application.Segments;

public interface ISegmentService
{
    Task<IReadOnlyList<SegmentDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<SegmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<SegmentDto> CreateAsync(CreateSegmentRequest request, int actorUserId, CancellationToken cancellationToken);
    Task<SegmentDto> UpdateAsync(int id, UpdateSegmentRequest request, int actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);
}
