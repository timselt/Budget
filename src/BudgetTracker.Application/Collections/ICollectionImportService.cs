using BudgetTracker.Application.Collections.Dtos;

namespace BudgetTracker.Application.Collections;

public interface ICollectionImportService
{
    Task<ImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        int segmentId,
        int companyId,
        int actorUserId,
        CancellationToken ct = default);
}
