using BudgetTracker.Application.Pricing;
using BudgetTracker.Application.Reconciliation.Lines;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Infrastructure.Reconciliation.Lines;

/// <summary>
/// Sprint 2 Task 5 implementasyonu — IPricingLookupService'i çağırır,
/// sonucu Line domain metotlarına çevirir.
/// <para>
/// Match mapping (spec 01_phase1_domain_model §5.1 + 00b §3.3):
/// <list type="bullet">
///   <item>Found → Line.ResolveAsReady</item>
///   <item>PricingMismatch → Line.ResolveAsPricingMismatch (contract fiyatı uygulanır)</item>
///   <item>ContractNotFound → Line.ResolveAsRejected(reason=Other, note="CONTRACT_NOT_FOUND")</item>
///   <item>ProductNotFound → Line.ResolveAsRejected(reason=PkgNotInContract, ...)</item>
///   <item>MultipleContracts → Line.ResolveAsRejected(reason=Other, note="AMBIGUOUS_CONTRACT")</item>
/// </list>
/// </para>
/// </summary>
public sealed class LinePricingResolver : ILinePricingResolver
{
    private readonly IPricingLookupService _lookup;
    private readonly TimeProvider _time;

    public LinePricingResolver(IPricingLookupService lookup, TimeProvider time)
    {
        _lookup = lookup;
        _time = time;
    }

    public async Task ResolveAsync(
        ReconciliationLine line,
        int customerId,
        ReconciliationFlow flow,
        string periodCode,
        decimal? expectedUnitPrice,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(line);

        var result = await _lookup.LookupAsync(
            customerId: customerId,
            flow: flow.ToString(),
            periodCode: periodCode,
            productCode: line.ProductCode,
            expectedUnitPrice: expectedUnitPrice,
            cancellationToken: cancellationToken).ConfigureAwait(false);

        var now = _time.GetUtcNow();
        var match = result.Match;
        var priceSourceRef = FormatPriceSourceRef(result);

        switch (match)
        {
            case "Found" when result.PriceBookItem is not null:
                line.ResolveAsReady(result.PriceBookItem.UnitPrice, priceSourceRef, now);
                break;

            case "PricingMismatch" when result.PriceBookItem is not null:
                line.ResolveAsPricingMismatch(result.PriceBookItem.UnitPrice, priceSourceRef, now);
                break;

            case "ContractNotFound":
                line.ResolveAsRejected(DisputeReasonCode.Other, "CONTRACT_NOT_FOUND", now);
                break;

            case "ProductNotFound":
                line.ResolveAsRejected(DisputeReasonCode.PkgNotInContract,
                    $"product '{line.ProductCode}' not in contract price book", now);
                break;

            case "MultipleContracts":
                line.ResolveAsRejected(DisputeReasonCode.Other,
                    "AMBIGUOUS_CONTRACT — multiple active contracts match", now);
                break;

            default:
                // Bilinmeyen match değeri — savunmacı davranış: reject.
                line.ResolveAsRejected(DisputeReasonCode.Other,
                    $"unknown pricing match result: {match}", now);
                break;
        }
    }

    private static string FormatPriceSourceRef(PricingLookupResult result)
    {
        if (result.PriceBookId is null) return "UNRESOLVED";
        var ver = result.PriceBookVersion?.ToString() ?? "?";
        return $"PB#{result.PriceBookId}-V{ver}";
    }
}
