using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Batches;

/// <summary>
/// Liste view için özet — UI grid satırı.
///
/// Enum alanları (<c>Flow</c>, <c>SourceType</c>, <c>Status</c>) string olarak
/// expose edilir: codebase pattern (PriceBookDto, ContractDto, ImportPeriodDto)
/// ile uyumlu, JSON serializasyonunda enum integer dönüp SPA'da
/// `.toLowerCase is not a function` hatası vermesini engeller. Service
/// layer .ToString() ile çevirir.
/// </summary>
public sealed record BatchSummaryDto(
    int Id,
    string Flow,
    string PeriodCode,
    string SourceType,
    string SourceFileName,
    int RowCount,
    string Status,
    DateTimeOffset ImportedAt,
    int ImportedByUserId,
    string? Notes);

/// <summary>
/// Detay view + import sonucu — parse istatistikleri + truncation flag.
/// Enum alanları string olarak expose edilir; <see cref="BatchSummaryDto"/>
/// XML doc'una bkz.
/// </summary>
public sealed record BatchDetailDto(
    int Id,
    string Flow,
    string PeriodCode,
    string SourceType,
    string SourceFileName,
    string SourceFileHash,
    int RowCount,
    int OkCount,
    int WarningCount,
    int ErrorCount,
    bool Truncated,
    string Status,
    DateTimeOffset ImportedAt,
    int ImportedByUserId,
    string? Notes);

/// <summary>
/// Batch listesi filtreleri (query string'den çözülür). Burada strong-typed
/// enum kalır; ASP.NET Core model binding `?flow=Insurance` string'ini
/// otomatik enum'a çözer.
/// </summary>
public sealed record BatchListQuery(
    ReconciliationFlow? Flow = null,
    string? PeriodCode = null,
    ReconciliationBatchStatus? Status = null);
