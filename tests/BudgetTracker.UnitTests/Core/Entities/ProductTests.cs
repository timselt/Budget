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
            coverageTermsJson: """{"coverages":[{"name":"5 gün","description":"5 günlük ikame araç","value":"5 gün"},{"name":"3 değişim","description":"3 defa araç değişimi"}]}""",
            defaultCurrencyCode: "try");

        product.Code.Should().Be("IKAME_5X3");
        product.Name.Should().Be("İkame Araç 5x3 gün");
        product.ProductCategoryId.Should().Be(10);
        product.DisplayOrder.Should().Be(2);
        product.CoverageTermsJson.Should().Contain("coverages");
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
    public void Create_AcceptsWellFormedCoverageTerms()
    {
        const string json = """
        {
          "coverages": [
            { "name": "Günlük limit", "description": "Günde en fazla 5 km", "value": "5 km/gün" },
            { "name": "Yıllık değişim", "description": "Yıl içinde 3 kez" }
          ]
        }
        """;

        var product = Product.Create(1, 1, "OK", "N", 1, Now, coverageTermsJson: json);
        product.CoverageTermsJson.Should().Contain("coverages");
    }

    [Fact]
    public void Create_ThrowsWhenCoverageTermsJsonMalformed()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now, coverageTermsJson: "{not json");
        act.Should().Throw<ArgumentException>().WithMessage("*valid JSON*");
    }

    [Fact]
    public void Create_ThrowsWhenCoverageTermsMissingCoveragesArray()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now,
            coverageTermsJson: """{"foo":"bar"}""");
        act.Should().Throw<ArgumentException>().WithMessage("*coverages*");
    }

    [Fact]
    public void Create_ThrowsWhenCoverageTermMissingName()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now,
            coverageTermsJson: """{"coverages":[{"description":"açıklama"}]}""");
        act.Should().Throw<ArgumentException>().WithMessage("*name*");
    }

    [Fact]
    public void Create_ThrowsWhenCoverageTermMissingDescription()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now,
            coverageTermsJson: """{"coverages":[{"name":"Ad"}]}""");
        act.Should().Throw<ArgumentException>().WithMessage("*description*");
    }

    [Fact]
    public void Create_ThrowsWhenCoverageTermFieldsBlank()
    {
        var act = () => Product.Create(1, 1, "X", "N", 1, Now,
            coverageTermsJson: """{"coverages":[{"name":"  ","description":""}]}""");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_AcceptsEmptyCoverages()
    {
        var product = Product.Create(1, 1, "X", "N", 1, Now, coverageTermsJson: """{"coverages":[]}""");
        product.CoverageTermsJson.Should().Contain("coverages");
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
            coverageTermsJson: """{"coverages":[{"name":"2 gün","description":"2 günlük teminat"}]}""",
            defaultCurrencyCode: "USD");

        product.ProductCategoryId.Should().Be(5);
        product.Name.Should().Be("New Name");
        product.DisplayOrder.Should().Be(3);
        product.IsActive.Should().BeFalse();
        product.CoverageTermsJson.Should().Contain("coverages");
        product.DefaultCurrencyCode.Should().Be("USD");
        product.UpdatedAt.Should().Be(later);
    }
}
