namespace BudgetTracker.Application.BudgetTree;

/// <summary>
/// Bütçe planlama ağacının (Şirket → Segment → Müşteri + OPEX kategorileri)
/// tek çağrıda frontend'e teslim edilen aggregate görünümü. BudgetEntryPage
/// sol panel tree yapısı + sağ panel müşteri/OPEX drill-down için kullanılır.
/// 12 aylık toplam TRY (sabit kur) bazında; multi-currency detay entity
/// seviyesinde kalır.
/// </summary>
public sealed record BudgetTreeDto(
    int VersionId,
    string VersionName,
    string VersionStatus,
    int BudgetYear,
    decimal RevenueTotalTry,
    decimal ClaimTotalTry,
    decimal ExpenseTotalTry,
    IReadOnlyList<BudgetTreeSegmentDto> Segments,
    IReadOnlyList<BudgetTreeOpexDto> OpexCategories);

/// <summary>Segment seviyesi toplam + altındaki müşterilerin kırılımı.</summary>
public sealed record BudgetTreeSegmentDto(
    int SegmentId,
    string SegmentCode,
    string SegmentName,
    decimal RevenueTotalTry,
    decimal ClaimTotalTry,
    IReadOnlyList<BudgetTreeCustomerDto> Customers);

/// <summary>
/// Müşteri satırı — 12 aylık revenue/claim dizileri (index 0=Ocak, 11=Aralık).
/// Aylık TRY sabit-kur tutarı; BudgetEntry bulunmayan aylar 0 olarak döner
/// (sparse değil, tam 12 eleman garantili).
/// </summary>
public sealed record BudgetTreeCustomerDto(
    int CustomerId,
    string CustomerCode,
    string CustomerName,
    int SegmentId,
    int ActiveContractCount,
    decimal RevenueTotalTry,
    decimal ClaimTotalTry,
    decimal LossRatioPercent,
    IReadOnlyList<decimal> RevenueMonthlyTry,
    IReadOnlyList<decimal> ClaimMonthlyTry);

/// <summary>OPEX (gider) kategorisi — müşteri-bağımsız, aylık dizi.</summary>
public sealed record BudgetTreeOpexDto(
    int ExpenseCategoryId,
    string CategoryCode,
    string CategoryName,
    string Classification,
    decimal TotalTry,
    IReadOnlyList<decimal> MonthlyTry);
