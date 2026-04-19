namespace BudgetTracker.Application.Pricing;

/// <summary>Fiyat arama servisi (00b §3.3). SLA: p95 &lt; 5ms (cache ile).</summary>
public interface IPricingLookupService
{
    /// <summary>
    /// <paramref name="flow"/>: "Insurance" | "Automotive".
    /// <paramref name="periodCode"/>: "YYYY-MM" (örn. "2026-04").
    /// <paramref name="expectedUnitPrice"/>: verilirse PricingMismatch kontrolü
    /// yapılır; verilmezse eşleşme Found olarak döner.
    /// </summary>
    Task<PricingLookupResult> LookupAsync(
        int customerId,
        string flow,
        string periodCode,
        string productCode,
        decimal? expectedUnitPrice,
        CancellationToken cancellationToken);

    /// <summary>Bir sözleşmenin tüm cache girdilerini invalidate eder (PriceBook approve sonrası).</summary>
    void InvalidateForContract(int contractId);
}
