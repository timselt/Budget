using BudgetTracker.Application.Collections.Dtos;

namespace BudgetTracker.Application.Collections;

public interface ICollectionQueryService
{
    Task<List<ImportPeriodDto>> GetPeriodsAsync(
        int companyId,
        int? segmentId = null,
        CancellationToken ct = default);

    Task<List<TopOverdueCustomerDto>> GetTopOverdueAsync(
        int companyId,
        int n = 10,
        int? periodId = null,
        CancellationToken ct = default);
}
