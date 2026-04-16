namespace BudgetTracker.Application.Collections.Dtos;

public sealed record SegmentDashboardDto(
    SegmentSummaryDto Summary,
    List<CustomerCollectionRowDto> Customers,
    List<TopOverdueCustomerDto> TopOverdue,
    List<TopOverdueCustomerDto> TopPending,
    ConcentrationDto Concentration);
