namespace BudgetTracker.Application.BudgetOperations;

/// <summary>
/// BudgetEntryPage sağ panel hızlı işlemleri — "Geçen Yıl Kopyala" ve
/// "+%X Büyüt". Her iki operasyon hedef version'ı overwrite eder; version
/// DRAFT veya REJECTED olmalı.
/// </summary>
public interface IBudgetOperationsService
{
    /// <summary>
    /// Kaynak bütçe yılının "aktif" versiyonundan (ACTIVE state) hedef
    /// version'a tüm revenue/claim satırlarını kopyalar. Filtreler opsiyonel —
    /// belirtilmezse tüm müşteriler × tüm aylar kopyalanır.
    /// </summary>
    Task<CopyResultDto> CopyFromYearAsync(
        int targetVersionId,
        CopyFromYearRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Hedef version'daki revenue/claim satırlarını verilen yüzdeyle büyütür
    /// (negatif değer küçültür). Yüzde -99'dan küçük olamaz, 200'den büyük
    /// olamaz (domain constraint). FX alanları yeniden hesaplanır çünkü
    /// AmountOriginal değişir.
    /// </summary>
    Task<GrowResultDto> GrowByPercentAsync(
        int targetVersionId,
        GrowByPercentRequest request,
        int actorUserId,
        CancellationToken cancellationToken);
}

public sealed record CopyFromYearRequest(
    int SourceBudgetYearId,
    int? CustomerId = null,
    int? ProductId = null);

public sealed record CopyResultDto(
    int CopiedEntryCount,
    int OverwrittenEntryCount,
    decimal RevenueTotalTry,
    decimal ClaimTotalTry);

public sealed record GrowByPercentRequest(
    decimal Percent,
    int? CustomerId = null,
    int? ProductId = null);

public sealed record GrowResultDto(
    int UpdatedEntryCount,
    decimal NewRevenueTotalTry,
    decimal NewClaimTotalTry);
