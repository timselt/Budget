namespace BudgetTracker.Application.Collections.Dtos;

public sealed record TopOverdueCustomerDto(
    int CustomerId,
    string CustomerName,
    decimal Amount,
    decimal SharePercent);
