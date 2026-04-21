using System.Collections.Concurrent;
using System.Globalization;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.PriceBooks;
using BudgetTracker.Application.Pricing;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Contracts;
using BudgetTracker.Core.Enums.PriceBooks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// Fiyat arama algoritması (00b §2.3). Sonuç IMemoryCache'te (L1) 5 dakika
/// tutulur; PriceBook onayı sonrası ilgili contract'ın tüm girdileri
/// <see cref="InvalidateForContract"/> ile düşürülür.
/// Redis kullanılmaz (CLAUDE.md §stack yasakları).
/// </summary>
public sealed class PricingLookupService : IPricingLookupService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly IApplicationDbContext _db;
    private readonly IMemoryCache _cache;

    // contract_id → CancellationTokenSource: invalidation için.
    private static readonly ConcurrentDictionary<int, CancellationTokenSource> InvalidationTokens = new();

    public PricingLookupService(IApplicationDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<PricingLookupResult> LookupAsync(
        int customerId,
        string flow,
        string periodCode,
        string productCode,
        decimal? expectedUnitPrice,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(flow);
        ArgumentException.ThrowIfNullOrWhiteSpace(periodCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(productCode);
        // ADR-0017: Filo + Alternatif mutabakat akışları pilot amaçlı mevcut
        // ContractFlow değerlerine eşlenir. Filo → Automotive (SalesType.Fleet
        // zaten Automotive flow'una mapping'li), Alternatif → Insurance
        // (DirectChannel/Medical Insurance flow'una mapping'li). Gerçek
        // SalesType genişletmesi sonraki fazda.
        var normalizedFlow = flow.Trim() switch
        {
            var f when string.Equals(f, "Filo", StringComparison.OrdinalIgnoreCase) => "Automotive",
            var f when string.Equals(f, "Alternatif", StringComparison.OrdinalIgnoreCase) => "Insurance",
            _ => flow,
        };
        if (!Enum.TryParse<ContractFlow>(normalizedFlow, ignoreCase: true, out var parsedFlow))
        {
            throw new ArgumentException($"invalid flow: '{flow}' (Insurance|Automotive|Filo|Alternatif)", nameof(flow));
        }
        var (periodStart, periodEnd) = ParsePeriod(periodCode);
        var normalizedCode = productCode.Trim();

        var cacheKey = $"pricing:{customerId}:{parsedFlow}:{periodCode}:{normalizedCode}";
        if (_cache.TryGetValue<PricingLookupResult>(cacheKey, out var cached) && cached is not null)
        {
            return ApplyExpectedPriceCheck(cached, expectedUnitPrice);
        }

        var matchingSalesTypes = Enum.GetValues<SalesType>()
            .Where(st => ContractFlowMapper.FromSalesType(st) == parsedFlow)
            .ToArray();

        var contractsQuery = _db.Contracts
            .Where(c => c.CustomerId == customerId
                && c.Status == ContractStatus.Active
                && matchingSalesTypes.Contains(c.SalesType)
                && (c.StartDate == null || c.StartDate <= periodEnd)
                && (c.EndDate == null || c.EndDate >= periodStart));

        var contracts = await contractsQuery.ToListAsync(cancellationToken);

        PricingLookupResult result;
        if (contracts.Count == 0)
        {
            result = new PricingLookupResult(
                PricingLookupMatch.ContractNotFound.ToString(),
                null, null, null, null, null,
                Array.Empty<string>());
        }
        else if (contracts.Count > 1)
        {
            result = new PricingLookupResult(
                PricingLookupMatch.MultipleContracts.ToString(),
                null, null, null, null, null,
                contracts.Select(c => $"Contract candidate: {c.ContractCode}").ToArray());
        }
        else
        {
            var contract = contracts[0];
            var pb = await _db.PriceBooks
                .Where(p => p.ContractId == contract.Id
                    && p.Status == PriceBookStatus.Active
                    && p.EffectiveFrom <= periodEnd
                    && (p.EffectiveTo == null || p.EffectiveTo >= periodStart))
                .OrderByDescending(p => p.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (pb is null)
            {
                result = new PricingLookupResult(
                    PricingLookupMatch.ContractNotFound.ToString(),
                    contract.Id, contract.ContractCode, null, null, null,
                    new[] { "no active PriceBook in period" });
            }
            else
            {
                var item = await _db.PriceBookItems
                    .Where(i => i.PriceBookId == pb.Id && i.ProductCode == normalizedCode)
                    .FirstOrDefaultAsync(cancellationToken);

                if (item is null)
                {
                    result = new PricingLookupResult(
                        PricingLookupMatch.ProductNotFound.ToString(),
                        contract.Id, contract.ContractCode, pb.Id, pb.VersionNo, null,
                        Array.Empty<string>());
                }
                else
                {
                    result = new PricingLookupResult(
                        PricingLookupMatch.Found.ToString(),
                        contract.Id, contract.ContractCode, pb.Id, pb.VersionNo,
                        MapItem(item),
                        Array.Empty<string>());
                }
            }

            // Cache girişini invalidation token ile bağla.
            var cts = InvalidationTokens.GetOrAdd(contract.Id, _ => new CancellationTokenSource());
            var options = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(CacheTtl)
                .AddExpirationToken(new Microsoft.Extensions.Primitives.CancellationChangeToken(cts.Token));
            _cache.Set(cacheKey, result, options);
        }

        if (contracts.Count != 1)
        {
            // ContractNotFound / MultipleContracts sonuçlarını da kısaca cache'le.
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(1));
        }

        return ApplyExpectedPriceCheck(result, expectedUnitPrice);
    }

    public void InvalidateForContract(int contractId)
    {
        if (InvalidationTokens.TryRemove(contractId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
    }

    private static PricingLookupResult ApplyExpectedPriceCheck(
        PricingLookupResult result, decimal? expectedUnitPrice)
    {
        if (result.Match != PricingLookupMatch.Found.ToString()) return result;
        if (expectedUnitPrice is null) return result;
        var item = result.PriceBookItem;
        if (item is null) return result;
        if (item.UnitPrice == expectedUnitPrice.Value) return result;
        return result with
        {
            Match = PricingLookupMatch.PricingMismatch.ToString(),
            Warnings = new[]
            {
                $"expected unit price {expectedUnitPrice.Value} != PriceBook {item.UnitPrice}"
            }
        };
    }

    private static (DateOnly start, DateOnly end) ParsePeriod(string periodCode)
    {
        // "YYYY-MM" format; ileride "YYYY-MM-DD" veya çeyrek kodları için
        // ayrı parser çağrısı eklenebilir.
        if (!DateOnly.TryParseExact(periodCode + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var start))
        {
            throw new ArgumentException($"invalid period_code '{periodCode}' (expected YYYY-MM)", nameof(periodCode));
        }
        var end = start.AddMonths(1).AddDays(-1);
        return (start, end);
    }

    private static PriceBookItemDto MapItem(PriceBookItem i) => new(
        i.Id, i.PriceBookId, i.ProductCode, i.ProductName,
        i.ItemType.ToString(), i.Unit, i.UnitPrice, i.CurrencyCode,
        i.TaxRate, i.MinQuantity, i.Notes);
}
