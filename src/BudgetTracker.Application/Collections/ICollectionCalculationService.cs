using BudgetTracker.Application.Collections.Dtos;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Application.Collections;

public interface ICollectionCalculationService
{
    CollectionRiskLevel CalculateRisk(decimal overdueAmount, double avgDelayDays);

    Task<ConsolidatedDashboardDto> GetConsolidatedDashboardAsync(
        int companyId,
        int? periodId = null,
        CancellationToken ct = default);

    Task<SegmentDashboardDto> GetSegmentDashboardAsync(
        int companyId,
        int segmentId,
        int? periodId = null,
        CancellationToken ct = default);

    Task<List<CustomerInvoiceDetailDto>> GetCustomerInvoicesAsync(
        int companyId,
        int customerId,
        int? periodId = null,
        CancellationToken ct = default);
}
