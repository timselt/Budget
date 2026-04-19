using BudgetTracker.Application.Reconciliation.Import;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

public sealed class DateFormatDetectorTests
{
    [Theory]
    [InlineData("2026-04-19", 2026, 4, 19)]
    [InlineData("2026-04-19T10:30:00", 2026, 4, 19)]
    [InlineData("2026-04-19 10:30:00", 2026, 4, 19)]
    [InlineData("19.04.2026", 2026, 4, 19)]
    [InlineData("19.04.2026 10:30:00", 2026, 4, 19)]
    [InlineData("9.4.2026", 2026, 4, 9)]                  // TR tek hane
    [InlineData("19/04/2026", 2026, 4, 19)]               // TR slash
    [InlineData("19-04-2026", 2026, 4, 19)]               // TR tire
    public void ParseDate_ValidFormats_ReturnsDateOnly(string input, int year, int month, int day)
    {
        var result = DateFormatDetector.ParseDate(input);
        result.Should().Be(new DateOnly(year, month, day));
    }

    [Fact]
    public void ParseDate_InvalidFormat_Throws()
    {
        var act = () => DateFormatDetector.ParseDate("not-a-date");
        act.Should().Throw<FormatException>();
    }

    [Fact]
    public void ParseDate_EmptyInput_Throws()
    {
        var act = () => DateFormatDetector.ParseDate("");
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("2026-04", true)]
    [InlineData("2000-01", true)]
    [InlineData("2100-12", true)]
    [InlineData("1999-12", false)]    // year < 2000
    [InlineData("2101-01", false)]    // year > 2100
    [InlineData("2026-13", false)]    // month > 12
    [InlineData("2026-00", false)]    // month < 1
    [InlineData("2026/04", false)]    // wrong separator
    [InlineData("26-04", false)]      // wrong year length
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValidPeriodCode_Validates(string? input, bool expected)
    {
        var result = DateFormatDetector.IsValidPeriodCode(input!);
        result.Should().Be(expected);
    }
}
