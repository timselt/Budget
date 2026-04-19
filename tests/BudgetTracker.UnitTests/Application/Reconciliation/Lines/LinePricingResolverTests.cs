using BudgetTracker.Application.PriceBooks;
using BudgetTracker.Application.Pricing;
using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using BudgetTracker.Infrastructure.Reconciliation.Lines;
using FluentAssertions;
using NSubstitute;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Lines;

/// <summary>
/// Sprint 2 Task 5 — PriceBook lookup sonucu → Line status mapping doğrulaması.
/// IPricingLookupService mocked, Line domain metodları real.
/// </summary>
public sealed class LinePricingResolverTests
{
    private static ReconciliationLine MakeLine(string productCode = "PKT-STD", decimal qty = 1m)
    {
        return ReconciliationLine.Create(
            caseId: 1, sourceRowId: 1,
            productCode: productCode, productName: "Standart",
            quantity: qty, unitPrice: 0m,
            currencyCode: "TRY", priceSourceRef: "UNRESOLVED",
            createdAt: DateTimeOffset.UtcNow);
    }

    private static PriceBookItemDto MakeItemDto(decimal unitPrice) =>
        new(Id: 1, PriceBookId: 42, ProductCode: "PKT-STD", ProductName: "Standart",
            ItemType: "InsurancePackage", Unit: "PCS", UnitPrice: unitPrice,
            CurrencyCode: "TRY", TaxRate: 20m, MinQuantity: null, Notes: null);

    [Fact]
    public async Task ResolveAsync_Found_SetsReadyWithContractPrice()
    {
        var lookup = Substitute.For<IPricingLookupService>();
        lookup.LookupAsync(1, "Insurance", "2026-04", "PKT-STD", null, Arg.Any<CancellationToken>())
            .Returns(new PricingLookupResult(
                Match: "Found",
                ContractId: 10, ContractCode: "CTR-01",
                PriceBookId: 42, PriceBookVersion: 3,
                PriceBookItem: MakeItemDto(125m),
                Warnings: Array.Empty<string>()));
        var resolver = new LinePricingResolver(lookup, TimeProvider.System);
        var line = MakeLine();

        await resolver.ResolveAsync(line, customerId: 1, flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04", expectedUnitPrice: null);

        line.Status.Should().Be(ReconciliationLineStatus.Ready);
        line.UnitPrice.Should().Be(125m);
        line.Amount.Should().Be(125m);
        line.PriceSourceRef.Should().Be("PB#42-V3");
    }

    [Fact]
    public async Task ResolveAsync_PricingMismatch_AppliesContractPriceAndFlagsMismatch()
    {
        var lookup = Substitute.For<IPricingLookupService>();
        lookup.LookupAsync(1, "Insurance", "2026-04", "PKT-STD", 999m, Arg.Any<CancellationToken>())
            .Returns(new PricingLookupResult(
                Match: "PricingMismatch",
                ContractId: 10, ContractCode: "CTR-01",
                PriceBookId: 42, PriceBookVersion: 3,
                PriceBookItem: MakeItemDto(125m),
                Warnings: new[] { "expected 999 differs from contract 125" }));
        var resolver = new LinePricingResolver(lookup, TimeProvider.System);
        var line = MakeLine();

        await resolver.ResolveAsync(line, customerId: 1, flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04", expectedUnitPrice: 999m);

        line.Status.Should().Be(ReconciliationLineStatus.PricingMismatch);
        line.UnitPrice.Should().Be(125m, "contract price enforced");
        line.DisputeReasonCode.Should().Be(DisputeReasonCode.PriceMismatch);
    }

    [Fact]
    public async Task ResolveAsync_ContractNotFound_RejectsLine()
    {
        var lookup = Substitute.For<IPricingLookupService>();
        lookup.LookupAsync(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<decimal?>(), Arg.Any<CancellationToken>())
            .Returns(new PricingLookupResult(
                Match: "ContractNotFound",
                ContractId: null, ContractCode: null,
                PriceBookId: null, PriceBookVersion: null,
                PriceBookItem: null,
                Warnings: Array.Empty<string>()));
        var resolver = new LinePricingResolver(lookup, TimeProvider.System);
        var line = MakeLine();

        await resolver.ResolveAsync(line, customerId: 1, flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04", expectedUnitPrice: null);

        line.Status.Should().Be(ReconciliationLineStatus.Rejected);
        line.DisputeReasonCode.Should().Be(DisputeReasonCode.Other);
        line.DisputeNote.Should().Be("CONTRACT_NOT_FOUND");
    }

    [Fact]
    public async Task ResolveAsync_ProductNotFound_RejectsWithPkgNotInContract()
    {
        var lookup = Substitute.For<IPricingLookupService>();
        lookup.LookupAsync(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<decimal?>(), Arg.Any<CancellationToken>())
            .Returns(new PricingLookupResult(
                Match: "ProductNotFound",
                ContractId: 10, ContractCode: "CTR-01",
                PriceBookId: 42, PriceBookVersion: 3,
                PriceBookItem: null,
                Warnings: Array.Empty<string>()));
        var resolver = new LinePricingResolver(lookup, TimeProvider.System);
        var line = MakeLine(productCode: "PKT-UNKNOWN");

        await resolver.ResolveAsync(line, customerId: 1, flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04", expectedUnitPrice: null);

        line.Status.Should().Be(ReconciliationLineStatus.Rejected);
        line.DisputeReasonCode.Should().Be(DisputeReasonCode.PkgNotInContract);
        line.DisputeNote.Should().Contain("PKT-UNKNOWN");
    }

    [Fact]
    public async Task ResolveAsync_MultipleContracts_RejectsWithAmbiguousContract()
    {
        var lookup = Substitute.For<IPricingLookupService>();
        lookup.LookupAsync(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<decimal?>(), Arg.Any<CancellationToken>())
            .Returns(new PricingLookupResult(
                Match: "MultipleContracts",
                ContractId: null, ContractCode: null,
                PriceBookId: null, PriceBookVersion: null,
                PriceBookItem: null,
                Warnings: new[] { "2 active contracts in period" }));
        var resolver = new LinePricingResolver(lookup, TimeProvider.System);
        var line = MakeLine();

        await resolver.ResolveAsync(line, customerId: 1, flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04", expectedUnitPrice: null);

        line.Status.Should().Be(ReconciliationLineStatus.Rejected);
        line.DisputeNote.Should().Contain("AMBIGUOUS_CONTRACT");
    }
}
