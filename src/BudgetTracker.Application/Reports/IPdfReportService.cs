namespace BudgetTracker.Application.Reports;

public interface IPdfReportService
{
    Task<byte[]> GenerateManagementReportAsync(int versionId, CancellationToken cancellationToken);
}
