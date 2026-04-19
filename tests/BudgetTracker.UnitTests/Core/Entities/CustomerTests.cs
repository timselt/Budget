using BudgetTracker.Core.Entities;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class CustomerTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_WithValidInputs_ReturnsCustomer()
    {
        var customer = Customer.Create(1, "CUST01", "Acme Corp", 2, 1, Now,
            startDate: new DateOnly(2024, 1, 1));

        customer.CompanyId.Should().Be(1);
        customer.Code.Should().Be("CUST01");
        customer.Name.Should().Be("Acme Corp");
        customer.SegmentId.Should().Be(2);
        customer.StartDate.Should().Be(new DateOnly(2024, 1, 1));
        customer.IsActive.Should().BeTrue();
        customer.CreatedByUserId.Should().Be(1);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_InvalidCompanyId_Throws(int companyId)
    {
        var act = () => Customer.Create(companyId, "C", "Name", 1, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_InvalidCode_Throws(string? code)
    {
        var act = () => Customer.Create(1, code!, "Name", 1, 1, Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_CodeTooLong_Throws()
    {
        var act = () => Customer.Create(1, new string('X', 31), "Name", 1, 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*max 30*");
    }

    [Fact]
    public void Create_NameTooLong_Throws()
    {
        var act = () => Customer.Create(1, "C", new string('X', 201), 1, 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*max 200*");
    }

    [Fact]
    public void Create_InvalidSegmentId_Throws()
    {
        var act = () => Customer.Create(1, "C", "Name", 0, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Update_ChangesFields()
    {
        var customer = Customer.Create(1, "C1", "Old", 1, 1, Now);
        var later = Now.AddHours(1);

        customer.Update(
            name: "New Name",
            segmentId: 2,
            categoryCode: null,
            subCategory: null,
            taxId: null,
            taxOffice: null,
            startDate: new DateOnly(2025, 6, 1),
            endDate: null,
            isGroupInternal: false,
            accountManager: null,
            defaultCurrencyCode: null,
            notes: "note",
            isActive: false,
            actorUserId: 5,
            updatedAt: later);

        customer.Name.Should().Be("New Name");
        customer.SegmentId.Should().Be(2);
        customer.StartDate.Should().Be(new DateOnly(2025, 6, 1));
        customer.EndDate.Should().BeNull();
        customer.Notes.Should().Be("note");
        customer.IsActive.Should().BeFalse();
        customer.UpdatedByUserId.Should().Be(5);
        customer.UpdatedAt.Should().Be(later);
    }

    // ----- Mutabakat önkoşul #1 (00a) — external ref -----

    [Fact]
    public void LinkExternalRef_ValidInputs_SetsFieldsAndVerificationStamp()
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        var at = Now.AddHours(2);

        customer.LinkExternalRef("1500003063", "LOGO", actorUserId: 7, verifiedAt: at);

        customer.ExternalCustomerRef.Should().Be("1500003063");
        customer.ExternalSourceSystem.Should().Be("LOGO");
        customer.ExternalRefVerifiedAt.Should().Be(at);
        customer.ExternalRefVerifiedByUserId.Should().Be(7);
        customer.UpdatedAt.Should().Be(at);
        customer.UpdatedByUserId.Should().Be(7);
    }

    [Theory]
    [InlineData("logo", "LOGO")]
    [InlineData("Mikro", "MIKRO")]
    [InlineData(" manual ", "MANUAL")]
    public void LinkExternalRef_NormalizesSourceSystemToUpperInvariant(string input, string expected)
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        customer.LinkExternalRef("ABC", input, 1, Now);
        customer.ExternalSourceSystem.Should().Be(expected);
    }

    [Fact]
    public void LinkExternalRef_TrimsExternalRef()
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        customer.LinkExternalRef("  1500003063  ", "LOGO", 1, Now);
        customer.ExternalCustomerRef.Should().Be("1500003063");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void LinkExternalRef_EmptyRef_Throws(string? extRef)
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        var act = () => customer.LinkExternalRef(extRef!, "LOGO", 1, Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void LinkExternalRef_RefTooLong_Throws()
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        var act = () => customer.LinkExternalRef(new string('X', 33), "LOGO", 1, Now);
        act.Should().Throw<ArgumentException>().WithMessage("*max 32*");
    }

    [Theory]
    [InlineData("SAP")]
    [InlineData("NETSIS")]
    [InlineData("")]
    public void LinkExternalRef_UnknownSourceSystem_Throws(string source)
    {
        var customer = Customer.Create(1, "C1", "Acme", 1, 1, Now);
        var act = () => customer.LinkExternalRef("1500001", source, 1, Now);
        act.Should().Throw<ArgumentException>();
    }
}
