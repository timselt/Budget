namespace BudgetTracker.Application.Reports;

/// <summary>
/// Per-tenant upload limits applied to every Excel import path (ADR-0008 §2.1).
/// </summary>
public static class ImportLimits
{
    public const long MaxBytes = 10L * 1024 * 1024;   // 10 MB
    public const int MaxRows = 50_000;                // excluding header
    public const string BudgetEntriesResource = "budget_entries";
}

public sealed record ExcelImportPreview(
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    IReadOnlyList<ExcelImportRowError> Errors,
    IReadOnlyList<string> Warnings);

public sealed record ExcelImportResult(
    int ImportedCount,
    int SkippedCount,
    IReadOnlyList<string> Warnings);

public sealed record ExcelImportRowError(int RowNumber, string Code, string Message);

public interface IExcelImportService
{
    /// <summary>
    /// Read-only validation pass: parses the file, reports row-level errors and
    /// warnings, but writes nothing to the domain tables. Still costs a size/row
    /// limit check because a preview of a 500 MB file would block a request
    /// thread; the limit applies uniformly.
    /// </summary>
    Task<ExcelImportPreview> PreviewAsync(
        int versionId,
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Durable commit: acquires a per-tenant advisory lock, runs the import
    /// inside a transaction, writes rows, emits audit events, and releases the
    /// lock at transaction end. Throws <see cref="Imports.ImportConcurrencyConflictException"/>
    /// on contention and <see cref="ImportFileTooLargeException"/> on limit overrun.
    /// </summary>
    Task<ExcelImportResult> CommitAsync(
        int versionId,
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken);
}

/// <summary>
/// Raised when either the file-size ceiling (10 MB) or the row-count ceiling
/// (50 000 data rows) is exceeded. Maps to HTTP 422 in GlobalExceptionHandler.
/// </summary>
public sealed class ImportFileTooLargeException : Exception
{
    public ImportFileTooLargeException(long actualBytes, int actualRows)
        : base(BuildMessage(actualBytes, actualRows))
    {
        ActualBytes = actualBytes;
        ActualRows = actualRows;
    }

    public long ActualBytes { get; }
    public int ActualRows { get; }

    private static string BuildMessage(long actualBytes, int actualRows)
    {
        if (actualBytes > ImportLimits.MaxBytes)
        {
            var actualMb = Math.Round(actualBytes / (1024.0 * 1024.0), 1);
            var limitMb = ImportLimits.MaxBytes / (1024 * 1024);
            return $"Dosya boyutu sınırı aşıldı: {actualMb} MB / {limitMb} MB.";
        }
        return $"Satır sınırı aşıldı: {actualRows} satır / {ImportLimits.MaxRows} satır.";
    }
}
