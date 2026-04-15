using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class BudgetVersionStateMachineTests
{
    private static BudgetVersion NewDraft() =>
        BudgetVersion.CreateDraft(
            companyId: 1,
            budgetYearId: 1,
            name: "2026 Bütçe v1",
            createdByUserId: 42);

    [Fact]
    public void CreateDraft_StartsInDraftStatus()
    {
        var version = NewDraft();

        version.Status.Should().Be(BudgetVersionStatus.Draft);
        version.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Submit_FromDraft_TransitionsToSubmitted()
    {
        var version = NewDraft();

        version.Submit(actorUserId: 42);

        version.Status.Should().Be(BudgetVersionStatus.Submitted);
    }

    [Theory]
    [InlineData(BudgetVersionStatus.Submitted)]
    [InlineData(BudgetVersionStatus.DeptApproved)]
    [InlineData(BudgetVersionStatus.FinanceApproved)]
    [InlineData(BudgetVersionStatus.CfoApproved)]
    [InlineData(BudgetVersionStatus.Active)]
    [InlineData(BudgetVersionStatus.Archived)]
    public void Submit_FromNonDraft_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.Submit(actorUserId: 42);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ApprovalChain_DraftToActive_Succeeds()
    {
        var version = NewDraft();

        version.Submit(42);
        version.ApproveByDepartment(43);
        version.ApproveByFinance(44);
        version.ApproveByCfo(45);
        version.Activate(45);

        version.Status.Should().Be(BudgetVersionStatus.Active);
        version.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Activate_RequiresCfoApproval()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByDepartment(43);
        version.ApproveByFinance(44);

        var act = () => version.Activate(45);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_FromAnyApprovalStage_TransitionsToRejected()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByDepartment(43);

        version.Reject(actorUserId: 44, reason: "Bütçe limiti aşıldı");

        version.Status.Should().Be(BudgetVersionStatus.Rejected);
    }

    [Fact]
    public void Archive_FromActive_TransitionsToArchived()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByDepartment(43);
        version.ApproveByFinance(44);
        version.ApproveByCfo(45);
        version.Activate(45);

        version.Archive(actorUserId: 45);

        version.Status.Should().Be(BudgetVersionStatus.Archived);
        version.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Reject_FromDraft_Throws()
    {
        var version = NewDraft();

        var act = () => version.Reject(42, "no");

        act.Should().Throw<InvalidOperationException>();
    }
}
