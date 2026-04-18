using BudgetTracker.Core.Entities;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class CustomerProductTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void Create_SetsFields()
    {
        var link = CustomerProduct.Create(
            companyId: 1,
            customerId: 42,
            productId: 7,
            createdAt: Now,
            createdByUserId: 3,
            commissionRate: 12.5m,
            unitPriceTry: 1500m,
            startDate: new DateOnly(2026, 1, 1),
            endDate: new DateOnly(2026, 12, 31),
            notes: "Yıllık kontrat");

        link.CustomerId.Should().Be(42);
        link.ProductId.Should().Be(7);
        link.CommissionRate.Should().Be(12.5m);
        link.UnitPriceTry.Should().Be(1500m);
        link.StartDate.Should().Be(new DateOnly(2026, 1, 1));
        link.EndDate.Should().Be(new DateOnly(2026, 12, 31));
        link.Notes.Should().Be("Yıllık kontrat");
        link.IsActive.Should().BeTrue();
    }

    [Theory]
    [InlineData(-0.1)]
    [InlineData(100.5)]
    public void Create_ThrowsWhenCommissionOutsideRange(decimal rate)
    {
        var act = () => CustomerProduct.Create(1, 1, 1, Now, commissionRate: rate);
        act.Should().Throw<ArgumentOutOfRangeException>()
            .WithMessage("*0 and 100*");
    }

    [Fact]
    public void Create_ThrowsWhenUnitPriceNegative()
    {
        var act = () => CustomerProduct.Create(1, 1, 1, Now, unitPriceTry: -1m);
        act.Should().Throw<ArgumentOutOfRangeException>().WithMessage("*non-negative*");
    }

    [Fact]
    public void Create_ThrowsWhenEndBeforeStart()
    {
        var act = () => CustomerProduct.Create(
            1, 1, 1, Now,
            startDate: new DateOnly(2026, 6, 1),
            endDate: new DateOnly(2026, 5, 1));

        act.Should().Throw<ArgumentException>().WithMessage("*end date*");
    }

    [Fact]
    public void Create_AllowsNullDates()
    {
        var link = CustomerProduct.Create(1, 1, 1, Now);
        link.StartDate.Should().BeNull();
        link.EndDate.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_ThrowsWhenCustomerIdNotPositive(int customerId)
    {
        var act = () => CustomerProduct.Create(1, customerId, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_ThrowsWhenProductIdNotPositive(int productId)
    {
        var act = () => CustomerProduct.Create(1, 1, productId, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Update_ChangesFields()
    {
        var link = CustomerProduct.Create(1, 1, 1, Now);
        var later = Now.AddDays(1);

        link.Update(
            actorUserId: 9,
            updatedAt: later,
            isActive: false,
            commissionRate: 15m,
            unitPriceTry: 2000m,
            startDate: new DateOnly(2026, 7, 1),
            endDate: new DateOnly(2027, 6, 30),
            notes: "Yenilendi");

        link.IsActive.Should().BeFalse();
        link.CommissionRate.Should().Be(15m);
        link.UnitPriceTry.Should().Be(2000m);
        link.Notes.Should().Be("Yenilendi");
        link.UpdatedAt.Should().Be(later);
        link.UpdatedByUserId.Should().Be(9);
    }
}
