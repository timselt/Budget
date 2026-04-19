using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.PriceBooks;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

/// <summary>00b PriceBook domain kuralları için unit testler.</summary>
public sealed class PriceBookTests
{
    [Fact]
    public void Create_StartsInDraftStatus()
    {
        var pb = NewDraft();
        pb.Status.Should().Be(PriceBookStatus.Draft);
        pb.ApprovedAt.Should().BeNull();
    }

    [Fact]
    public void AddItem_RejectsDuplicateProductCode()
    {
        var pb = NewDraft();
        pb.AddItem(Item("KSK-001"));

        var act = () => pb.AddItem(Item("KSK-001"));

        act.Should().Throw<InvalidOperationException>().WithMessage("*duplicate*");
    }

    [Fact]
    public void Approve_EmptyDraft_Throws()
    {
        var pb = NewDraft();

        var act = () => pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        act.Should().Throw<InvalidOperationException>().WithMessage("*empty*");
    }

    [Fact]
    public void Approve_PopulatesApproverAndTransitionsStatus()
    {
        var pb = NewDraft();
        pb.AddItem(Item("KSK-001"));

        pb.Approve(approverUserId: 7, approvedAt: DateTimeOffset.Parse("2026-04-19Z"));

        pb.Status.Should().Be(PriceBookStatus.Active);
        pb.ApprovedByUserId.Should().Be(7);
        pb.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public void Approve_AlreadyActive_Throws()
    {
        var pb = NewDraft();
        pb.AddItem(Item("KSK-001"));
        pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        var act = () => pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AddItem_AfterApproval_Throws()
    {
        var pb = NewDraft();
        pb.AddItem(Item("KSK-001"));
        pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        var act = () => pb.AddItem(Item("KSK-002"));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Draft*");
    }

    [Fact]
    public void Archive_SetsEffectiveToCap()
    {
        var pb = NewDraft();
        pb.AddItem(Item("KSK-001"));
        pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        var archiveOn = new DateOnly(2026, 5, 31);
        pb.Archive(actorUserId: 2, updatedAt: DateTimeOffset.UtcNow, archiveOn);

        pb.Status.Should().Be(PriceBookStatus.Archived);
        pb.EffectiveTo.Should().Be(archiveOn);
    }

    [Fact]
    public void ClearItems_OnlyOnDraft()
    {
        var pb = NewDraft();
        pb.AddItem(Item("A-1"));
        pb.AddItem(Item("A-2"));
        pb.Approve(approverUserId: 1, approvedAt: DateTimeOffset.UtcNow);

        var act = () => pb.ClearItems();

        act.Should().Throw<InvalidOperationException>();
    }

    private static PriceBook NewDraft() => PriceBook.Create(
        companyId: 1, contractId: 1, versionNo: 1,
        effectiveFrom: new DateOnly(2026, 1, 1), effectiveTo: null,
        createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);

    private static PriceBookItem Item(string code) => PriceBookItem.Create(
        priceBookId: 1, productCode: code, productName: $"Product {code}",
        itemType: PriceBookItemType.InsurancePackage, unit: "USE",
        unitPrice: 100m, currencyCode: "TRY",
        createdAt: DateTimeOffset.UtcNow, createdByUserId: 1);
}
