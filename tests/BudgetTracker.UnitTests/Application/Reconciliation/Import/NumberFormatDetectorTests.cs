using BudgetTracker.Application.Reconciliation.Import;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

/// <summary>
/// Sayı format toleransı (spec §6.3) — TR/EN tablo birebir docs/reconciliation/parser-fixtures.md §2.
/// </summary>
public sealed class NumberFormatDetectorTests
{
    [Theory]
    [InlineData("1234.56", 1234.56)]                       // EN ondalık
    [InlineData("1234,56", 1234.56)]                       // TR ondalık
    [InlineData("1.234,56", 1234.56)]                      // TR binlik+ondalık
    [InlineData("1,234.56", 1234.56)]                      // EN binlik+ondalık
    [InlineData("1234", 1234)]                             // saf tamsayı
    [InlineData("0", 0)]                                   // sıfır
    [InlineData("0,00", 0)]                                // TR sıfır ondalık
    [InlineData("12.345.678,90", 12345678.90)]             // çoklu binlik
    [InlineData("12,345,678.90", 12345678.90)]             // EN çoklu binlik
    public void Parse_ValidFormats_ReturnsDecimal(string input, double expected)
    {
        var result = NumberFormatDetector.Parse(input);
        result.Should().Be((decimal)expected);
    }

    [Theory]
    [InlineData("(123,45)", -123.45)]                      // accounting parantez (TR)
    [InlineData("(1,234.56)", -1234.56)]                   // accounting parantez (EN)
    [InlineData("-1.234,50", -1234.50)]                    // TR negatif eksi
    [InlineData("-123.45", -123.45)]                       // EN negatif eksi
    public void Parse_NegativeFormats_ReturnsNegative(string input, double expected)
    {
        var result = NumberFormatDetector.Parse(input);
        result.Should().Be((decimal)expected);
    }

    [Theory]
    [InlineData("₺ 1.234,50", 1234.50)]
    [InlineData("1.234,50 TL", 1234.50)]
    [InlineData("$1,234.56", 1234.56)]
    [InlineData("€ 999,99", 999.99)]
    [InlineData("100 TRY", 100)]
    public void Parse_CurrencySymbols_AreStripped(string input, double expected)
    {
        var result = NumberFormatDetector.Parse(input);
        result.Should().Be((decimal)expected);
    }

    [Fact]
    public void Parse_AmbiguousThousands_AssumesThousandsSeparator()
    {
        // "1.234" — tek nokta + 3 hane → binlik konvansiyon (parser-fixtures §2)
        var result = NumberFormatDetector.Parse("1.234");
        result.Should().Be(1234m);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_EmptyInput_Throws(string input)
    {
        var act = () => NumberFormatDetector.Parse(input);
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("12.34.56")]            // çoklu nokta + 2 hane sonrası → invariant parse fail
    [InlineData("12.34a")]              // alfa karışım
    [InlineData("1,2,3")]               // çoklu virgül belirsiz → invariant fail
    public void Parse_InvalidInput_ThrowsFormatException(string input)
    {
        var act = () => NumberFormatDetector.Parse(input);
        act.Should().Throw<FormatException>();
    }

    [Fact]
    public void TryParse_ValidInput_ReturnsTrue()
    {
        var ok = NumberFormatDetector.TryParse("1.234,56", out var value);
        ok.Should().BeTrue();
        value.Should().Be(1234.56m);
    }

    [Fact]
    public void TryParse_InvalidInput_ReturnsFalse()
    {
        var ok = NumberFormatDetector.TryParse("garbage", out var value);
        ok.Should().BeFalse();
        value.Should().Be(0m);
    }
}
