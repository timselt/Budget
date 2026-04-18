using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class BudgetEntryTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_WithValidInputs_ReturnsEntry()
    {
        var entry = BudgetEntry.Create(1, 10, 100, 3, EntryType.Revenue,
            50_000m, "TRY", 50_000m, 50_000m, 1, Now);

        entry.CompanyId.Should().Be(1);
        entry.VersionId.Should().Be(10);
        entry.CustomerId.Should().Be(100);
        entry.Month.Should().Be(3);
        entry.EntryType.Should().Be(EntryType.Revenue);
        entry.AmountOriginal.Should().Be(50_000m);
        entry.CurrencyCode.Should().Be("TRY");
        entry.AmountTryFixed.Should().Be(50_000m);
        entry.AmountTrySpot.Should().Be(50_000m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(-1)]
    public void Create_InvalidMonth_Throws(int month)
    {
        var act = () => BudgetEntry.Create(1, 10, 100, month, EntryType.Revenue,
            1000m, "TRY", 1000m, 1000m, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("AB")]
    [InlineData("ABCD")]
    public void Create_InvalidCurrencyCode_Throws(string cc)
    {
        var act = () => BudgetEntry.Create(1, 10, 100, 1, EntryType.Revenue,
            1000m, cc, 1000m, 1000m, 1, Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_InvalidVersionId_Throws()
    {
        var act = () => BudgetEntry.Create(1, 0, 100, 1, EntryType.Revenue,
            1000m, "TRY", 1000m, 1000m, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void UpdateAmount_ChangesAllAmountFields()
    {
        var entry = BudgetEntry.Create(1, 10, 100, 1, EntryType.Claim,
            1000m, "USD", 32_000m, 33_000m, 1, Now);
        var later = Now.AddDays(1);

        entry.UpdateAmount(2000m, "EUR", 64_000m, 66_000m, 5, later, "revised");

        entry.AmountOriginal.Should().Be(2000m);
        entry.CurrencyCode.Should().Be("EUR");
        entry.AmountTryFixed.Should().Be(64_000m);
        entry.AmountTrySpot.Should().Be(66_000m);
        entry.Notes.Should().Be("revised");
        entry.UpdatedByUserId.Should().Be(5);
    }

    [Fact]
    public void Create_WithClaimEntryType_Works()
    {
        var entry = BudgetEntry.Create(1, 10, 100, 12, EntryType.Claim,
            25_000m, "USD", 800_000m, 825_000m, 1, Now);

        entry.EntryType.Should().Be(EntryType.Claim);
        entry.Month.Should().Be(12);
    }

    [Fact]
    public void Create_WithQuantity_StoresIt()
    {
        // ADR-0013 §5 — ürün bazlı satır: quantity + productId opsiyonel olarak
        // gönderilebilir. Service katmanı UnitPriceTry × quantity ile amount
        // üretir; entity sadece quantity'yi invariant'la (non-negative) saklar.
        var entry = BudgetEntry.Create(1, 10, 100, 3, EntryType.Revenue,
            4_000m, "TRY", 4_000m, 4_000m, 1, Now,
            productId: 42, quantity: 80);

        entry.ProductId.Should().Be(42);
        entry.Quantity.Should().Be(80);
    }

    [Fact]
    public void Create_ThrowsWhenQuantityNegative()
    {
        var act = () => BudgetEntry.Create(1, 10, 100, 3, EntryType.Revenue,
            100m, "TRY", 100m, 100m, 1, Now, productId: 1, quantity: -1);
        act.Should().Throw<ArgumentOutOfRangeException>().WithMessage("*non-negative*");
    }

    [Fact]
    public void Create_AllowsZeroQuantity()
    {
        // Sıfır adet geçerli bir bütçe girdisi olabilir (örn. ürün pasif,
        // satışı 0 planlanıyor).
        var entry = BudgetEntry.Create(1, 10, 100, 3, EntryType.Revenue,
            0m, "TRY", 0m, 0m, 1, Now, productId: 1, quantity: 0);
        entry.Quantity.Should().Be(0);
    }
}
