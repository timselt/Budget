namespace BudgetTracker.Application.PriceBooks;

/// <summary>
/// PriceBook sürüm özeti (00b §3.2). Liste görünümlerinde kullanılır;
/// item'ları <see cref="PriceBookDetailDto"/> döner.
/// </summary>
public sealed record PriceBookDto(
    int Id,
    int ContractId,
    string ContractCode,
    int VersionNo,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    string Status,
    string? Notes,
    int? ApprovedByUserId,
    DateTimeOffset? ApprovedAt,
    int ItemCount,
    DateTimeOffset CreatedAt,
    int? CreatedByUserId,
    DateTimeOffset? UpdatedAt);

/// <summary>PriceBook + item listesi (detay endpoint'i).</summary>
public sealed record PriceBookDetailDto(
    PriceBookDto Header,
    IReadOnlyList<PriceBookItemDto> Items);
