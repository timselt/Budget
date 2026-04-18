using BudgetTracker.Core.Entities;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class ProductCategoryTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void Create_SetsFields()
    {
        var category = ProductCategory.Create(
            companyId: 1,
            code: "YOL_YARDIM",
            name: "Yol Yardım",
            displayOrder: 1,
            createdAt: Now,
            createdByUserId: 7,
            description: "Araç yol yardım hizmetleri",
            segmentId: 2);

        category.Code.Should().Be("YOL_YARDIM");
        category.Name.Should().Be("Yol Yardım");
        category.DisplayOrder.Should().Be(1);
        category.Description.Should().Be("Araç yol yardım hizmetleri");
        category.SegmentId.Should().Be(2);
        category.IsActive.Should().BeTrue();
        category.CompanyId.Should().Be(1);
        category.CreatedByUserId.Should().Be(7);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_ThrowsWhenCompanyIdNotPositive(int companyId)
    {
        var act = () => ProductCategory.Create(companyId, "X", "N", 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_ThrowsWhenCodeTooLong()
    {
        var act = () => ProductCategory.Create(1, new string('A', 31), "N", 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*30 characters*");
    }

    [Fact]
    public void Create_ThrowsWhenNameTooLong()
    {
        var act = () => ProductCategory.Create(1, "OK", new string('N', 151), 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*150 characters*");
    }

    [Fact]
    public void Create_ThrowsWhenSegmentIdNotPositive()
    {
        var act = () => ProductCategory.Create(1, "OK", "Name", 1, Now, segmentId: 0);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Update_ChangesFields()
    {
        var category = ProductCategory.Create(1, "IKAME", "İkame Araç", 1, Now);
        var later = Now.AddHours(2);

        category.Update(
            name: "İkame Araç (Yeni)",
            displayOrder: 5,
            isActive: false,
            actorUserId: 9,
            updatedAt: later,
            description: "Revize açıklama",
            segmentId: 3);

        category.Name.Should().Be("İkame Araç (Yeni)");
        category.DisplayOrder.Should().Be(5);
        category.IsActive.Should().BeFalse();
        category.Description.Should().Be("Revize açıklama");
        category.SegmentId.Should().Be(3);
        category.UpdatedAt.Should().Be(later);
        category.UpdatedByUserId.Should().Be(9);
    }
}
