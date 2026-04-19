using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Batches;

/// <summary>
/// Liste view için özet — UI grid satırı.
/// </summary>
public sealed record BatchSummaryDto(
    int Id,
    ReconciliationFlow Flow,
    string PeriodCode,
    ReconciliationSourceType SourceType,
    string SourceFileName,
    int RowCount,
    ReconciliationBatchStatus Status,
    DateTimeOffset ImportedAt,
    int ImportedByUserId,
    string? Notes);

/// <summary>
/// Detay view + import sonucu — parse istatistikleri + truncation flag.
/// </summary>
public sealed record BatchDetailDto(
    int Id,
    ReconciliationFlow Flow,
    string PeriodCode,
    ReconciliationSourceType SourceType,
    string SourceFileName,
    string SourceFileHash,
    int RowCount,
    int OkCount,
    int WarningCount,
    int ErrorCount,
    bool Truncated,
    ReconciliationBatchStatus Status,
    DateTimeOffset ImportedAt,
    int ImportedByUserId,
    string? Notes);

/// <summary>
/// Batch listesi filtreleri (query string'den çözülür).
/// </summary>
public sealed record BatchListQuery(
    ReconciliationFlow? Flow = null,
    string? PeriodCode = null,
    ReconciliationBatchStatus? Status = null);
