namespace BudgetTracker.Application.Reports;

public sealed record ExcelImportResult(int ImportedCount, int SkippedCount, IReadOnlyList<string> Warnings);

public interface IExcelImportService
{
    Task<ExcelImportResult> ImportBudgetEntriesAsync(
        int versionId,
        Stream excelStream,
        int actorUserId,
        CancellationToken cancellationToken);
}
