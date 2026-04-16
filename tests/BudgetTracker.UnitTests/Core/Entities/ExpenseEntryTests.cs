using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class ExpenseEntryTests
{
    private static readonly DateTimeOffset Now = new(2026, 2, 1, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_BudgetEntry_RequiresVersionId()
    {
        var act = () => ExpenseEntry.Create(1, null, 5, 3, 1, ExpenseEntryType.Budget,
            10_000m, "TRY", 10_000m, 10_000m, 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*versionId required*");
    }

    [Fact]
    public void Create_ActualEntry_AllowsNullVersionId()
    {
        var entry = ExpenseEntry.Create(1, null, 5, 3, 6, ExpenseEntryType.Actual,
            5_000m, "TRY", 5_000m, 5_000m, 1, Now);

        entry.VersionId.Should().BeNull();
        entry.EntryType.Should().Be(ExpenseEntryType.Actual);
    }

    [Fact]
    public void Create_WithValidInputs_SetsProperties()
    {
        var entry = ExpenseEntry.Create(1, 10, 5, 3, 7, ExpenseEntryType.Budget,
            20_000m, "USD", 640_000m, 660_000m, 2, Now, "IT license");

        entry.CompanyId.Should().Be(1);
        entry.VersionId.Should().Be(10);
        entry.BudgetYearId.Should().Be(5);
        entry.CategoryId.Should().Be(3);
        entry.Month.Should().Be(7);
        entry.AmountOriginal.Should().Be(20_000m);
        entry.Notes.Should().Be("IT license");
    }

    [Fact]
    public void Create_InvalidMonth_Throws()
    {
        var act = () => ExpenseEntry.Create(1, 10, 5, 3, 0, ExpenseEntryType.Budget,
            1000m, "TRY", 1000m, 1000m, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void UpdateAmount_ChangesFields()
    {
        var entry = ExpenseEntry.Create(1, 10, 5, 3, 1, ExpenseEntryType.Budget,
            1000m, "TRY", 1000m, 1000m, 1, Now);
        var later = Now.AddDays(1);

        entry.UpdateAmount(2000m, "EUR", 64_000m, 66_000m, 5, later);

        entry.AmountOriginal.Should().Be(2000m);
        entry.CurrencyCode.Should().Be("EUR");
        entry.UpdatedByUserId.Should().Be(5);
    }
}
