namespace BudgetTracker.Application.Customers;

public sealed record CustomerImportPreview(
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    IReadOnlyList<CustomerImportRowError> Errors,
    IReadOnlyList<string> Warnings);

public sealed record CustomerImportResult(
    int ImportedCount,
    int SkippedCount,
    IReadOnlyList<string> Warnings);

public sealed record CustomerImportRowError(int RowNumber, string Code, string Message);

public interface ICustomerImportService
{
    Task<CustomerImportPreview> PreviewAsync(
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<CustomerImportResult> CommitAsync(
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken);
}
