namespace BudgetTracker.Application.Collections.Dtos;

public sealed record CustomerInvoiceDetailDto(
    string InvoiceNo,
    DateTime TransactionDate,
    DateTime DueDate,
    int DaysDiff,
    decimal Amount,
    string? Note,
    string Status);
