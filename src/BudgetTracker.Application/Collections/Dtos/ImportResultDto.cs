namespace BudgetTracker.Application.Collections.Dtos;

public sealed record ImportResultDto(
    int PeriodId,
    int CustomersProcessed,
    int InvoicesProcessed,
    decimal TotalAmount,
    List<string> Warnings);
