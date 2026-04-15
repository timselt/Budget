using BudgetTracker.Core.Common;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Common;

public sealed class MoneyTests
{
    [Fact]
    public void Create_StoresAmountAndCurrency()
    {
        var money = Money.Create(100.50m, "TRY");

        money.Amount.Should().Be(100.50m);
        money.CurrencyCode.Should().Be("TRY");
    }

    [Theory]
    [InlineData("")]
    [InlineData("US")]
    [InlineData("USDT")]
    [InlineData("usd")]
    public void Create_RejectsInvalidCurrencyCode(string code)
    {
        var act = () => Money.Create(10m, code);

        act.Should().Throw<ArgumentException>().WithMessage("*currency*");
    }

    [Fact]
    public void Create_RejectsNegativeAmount()
    {
        var act = () => Money.Create(-1m, "TRY");

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(2.125, 2.12)]
    [InlineData(2.135, 2.14)]
    [InlineData(2.145, 2.14)]
    [InlineData(2.155, 2.16)]
    [InlineData(0.005, 0.00)]
    [InlineData(0.015, 0.02)]
    public void Round_UsesBankersRounding(decimal input, decimal expected)
    {
        var money = Money.Create(input, "TRY");

        var rounded = money.Round(2);

        rounded.Amount.Should().Be(expected);
        rounded.CurrencyCode.Should().Be("TRY");
    }

    [Fact]
    public void Add_SameCurrency_ReturnsSum()
    {
        var a = Money.Create(10m, "TRY");
        var b = Money.Create(15m, "TRY");

        var sum = a + b;

        sum.Amount.Should().Be(25m);
        sum.CurrencyCode.Should().Be("TRY");
    }

    [Fact]
    public void Add_DifferentCurrency_Throws()
    {
        var a = Money.Create(10m, "TRY");
        var b = Money.Create(15m, "USD");

        var act = () => { var _ = a + b; };

        act.Should().Throw<InvalidOperationException>().WithMessage("*currency*");
    }

    [Fact]
    public void Equality_IsValueBased()
    {
        var a = Money.Create(10m, "TRY");
        var b = Money.Create(10m, "TRY");

        a.Should().Be(b);
        (a == b).Should().BeTrue();
    }

    [Fact]
    public void Zero_ReturnsZeroAmountInRequestedCurrency()
    {
        var zero = Money.Zero("USD");

        zero.Amount.Should().Be(0m);
        zero.CurrencyCode.Should().Be("USD");
    }
}
