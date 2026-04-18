using BudgetTracker.Core.Entities;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class ProductTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void Create_SetsFields()
    {
        var product = Product.Create(
            companyId: 1,
            productCategoryId: 10,
            code: "IKAME_5X3",
            name: "İkame Araç 5x3 gün",
            displayOrder: 2,
            createdAt: Now,
            createdByUserId: 7,
            description: "5 gün × 3 değişim",
            coverageTermsJson: """{"days":5,"replacements":3,"limit_try":15000}""",
            defaultCurrencyCode: "try");

        product.Code.Should().Be("IKAME_5X3");
        product.Name.Should().Be("İkame Araç 5x3 gün");
        product.ProductCategoryId.Should().Be(10);
        product.DisplayOrder.Should().Be(2);
        product.CoverageTermsJson.Should().Contain("\"days\":5");
        product.DefaultCurrencyCode.Should().Be("TRY");
        product.IsActive.Should().BeTrue();
        product.CompanyId.Should().Be(1);
    }

    [Fact]
    public void Create_NormalizesCurrencyToUpper()
    {
        var product = Product.Create(1, 1, "X", "N", 1, Now, defaultCurrencyCode: "eur");
        product.DefaultCurrencyCode.Should().Be("EUR");
    }

    [Fact]
    public void Create_ThrowsWhenCurrencyWrongLength()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now, defaultCurrencyCode: "TR");
        act.Should().Throw<ArgumentException>().WithMessage("*currency*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_ThrowsWhenProductCategoryIdNotPositive(int categoryId)
    {
        var act = () => Product.Create(1, categoryId, "X", "N", 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_ThrowsWhenCodeTooLong()
    {
        var act = () => Product.Create(1, 1, new string('A', 31), "N", 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*30 characters*");
    }

    [Fact]
    public void Create_ThrowsWhenNameTooLong()
    {
        var act = () => Product.Create(1, 1, "OK", new string('N', 201), 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*200 characters*");
    }

    [Fact]
    public void Update_ChangesFields()
    {
        var product = Product.Create(1, 1, "OLD", "Old Name", 1, Now);
        var later = Now.AddHours(1);

        product.Update(
            productCategoryId: 5,
            name: "New Name",
            displayOrder: 3,
            isActive: false,
            actorUserId: 9,
            updatedAt: later,
            description: "d",
            coverageTermsJson: """{"days":2}""",
            defaultCurrencyCode: "USD");

        product.ProductCategoryId.Should().Be(5);
        product.Name.Should().Be("New Name");
        product.DisplayOrder.Should().Be(3);
        product.IsActive.Should().BeFalse();
        product.CoverageTermsJson.Should().Contain("days");
        product.DefaultCurrencyCode.Should().Be("USD");
        product.UpdatedAt.Should().Be(later);
    }
}
