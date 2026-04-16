using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class SpecialItemTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_YearlyItem_MonthIsNull()
    {
        var item = SpecialItem.Create(1, 10, 5, SpecialItemType.Amortisman,
            120_000m, "TRY", 1, Now);

        item.Month.Should().BeNull();
        item.ItemType.Should().Be(SpecialItemType.Amortisman);
        item.Amount.Should().Be(120_000m);
    }

    [Fact]
    public void Create_MonthlyItem_SetsMonth()
    {
        var item = SpecialItem.Create(1, null, 5, SpecialItemType.MuallakHasar,
            50_000m, "TRY", 1, Now, month: 3);

        item.Month.Should().Be(3);
        item.VersionId.Should().BeNull();
    }

    [Fact]
    public void Create_InvalidMonth_Throws()
    {
        var act = () => SpecialItem.Create(1, 10, 5, SpecialItemType.DemoFilo,
            1000m, "TRY", 1, Now, month: 13);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_InvalidCurrencyCode_Throws()
    {
        var act = () => SpecialItem.Create(1, 10, 5, SpecialItemType.FinansalGelir,
            1000m, "AB", 1, Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateAmount_ChangesFields()
    {
        var item = SpecialItem.Create(1, 10, 5, SpecialItemType.TKatilim,
            10_000m, "TRY", 1, Now);
        var later = Now.AddDays(5);

        item.UpdateAmount(15_000m, "USD", 5, later, "updated estimate");

        item.Amount.Should().Be(15_000m);
        item.CurrencyCode.Should().Be("USD");
        item.Notes.Should().Be("updated estimate");
        item.UpdatedByUserId.Should().Be(5);
    }

    [Fact]
    public void Create_AllSpecialItemTypes_Valid()
    {
        foreach (var itemType in Enum.GetValues<SpecialItemType>())
        {
            var item = SpecialItem.Create(1, 10, 5, itemType, 1000m, "TRY", 1, Now);
            item.ItemType.Should().Be(itemType);
        }
    }
}
