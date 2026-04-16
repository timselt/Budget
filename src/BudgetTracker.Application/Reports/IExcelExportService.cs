namespace BudgetTracker.Application.Reports;

public interface IExcelExportService
{
    Task<byte[]> ExportBudgetEntriesAsync(int versionId, CancellationToken cancellationToken);
}
