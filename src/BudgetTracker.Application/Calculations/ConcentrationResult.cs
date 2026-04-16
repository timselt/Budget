namespace BudgetTracker.Application.Calculations;

public sealed record ConcentrationResult(
    decimal TopNShare,
    decimal Hhi,
    IReadOnlyList<CustomerShareDto> TopCustomers);

public sealed record CustomerShareDto(
    int CustomerId,
    string? CustomerName,
    decimal Revenue,
    decimal Share);
