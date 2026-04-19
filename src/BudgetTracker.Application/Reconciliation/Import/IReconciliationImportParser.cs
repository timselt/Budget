using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// High-level orchestrator — dosya stream + flow alır, hash hesaplar,
/// stream reader (xlsx/csv) seçer, header mapping yapar, her satırı
/// validate eder ve <see cref="ParsedBatchResult"/> döner.
/// API endpoint Madde 4'te bunu çağırır.
/// </summary>
public interface IReconciliationImportParser
{
    /// <summary>
    /// Stream'i parse eder. Stream rewindable olmalı (hash hesaplama için).
    /// Parser BatchEntity yazımı yapmaz — sadece DTO döndürür; persistence
    /// orchestrator service'in işidir (Madde 4).
    /// </summary>
    /// <param name="fileName">
    /// Original dosya adı — extension'a göre xlsx/csv reader seçilir.
    /// Bilinmeyen extension: <see cref="ImportReadException"/>.
    /// </param>
    Task<ParsedBatchResult> ParseAsync(
        Stream fileStream,
        string fileName,
        ReconciliationFlow flow,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Parser çıktısı — hash + truncation flag + her satırın validate sonucu.
/// </summary>
public sealed record ParsedBatchResult(
    string SourceFileHash,
    int TotalRows,
    int OkRows,
    int WarningRows,
    int ErrorRows,
    bool Truncated,
    IReadOnlyList<TemplateRowValidationResult> Rows);
