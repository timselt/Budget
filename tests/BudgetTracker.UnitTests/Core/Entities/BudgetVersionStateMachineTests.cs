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

    // ---------- Submit ----------

    [Fact]
    public void Submit_FromDraft_GoesToPendingFinance()
    {
        var version = NewDraft();

        version.Submit(actorUserId: 42);

        version.Status.Should().Be(BudgetVersionStatus.PendingFinance);
        version.SubmittedByUserId.Should().Be(42);
        version.SubmittedAt.Should().NotBeNull();
    }

    [Fact]
    public void Submit_FromRejected_ResubmitsAndClearsRejectionReason()
    {
        var version = NewDraft();
        version.Submit(42);
        version.Reject(actorUserId: 43, reason: "Eksik hasar planı");

        version.Status.Should().Be(BudgetVersionStatus.Rejected);
        version.RejectionReason.Should().Be("Eksik hasar planı");

        version.Submit(actorUserId: 42);

        version.Status.Should().Be(BudgetVersionStatus.PendingFinance);
        version.RejectionReason.Should().BeNull();
    }

    [Theory]
    [InlineData(BudgetVersionStatus.PendingFinance)]
    [InlineData(BudgetVersionStatus.PendingCfo)]
    [InlineData(BudgetVersionStatus.Active)]
    [InlineData(BudgetVersionStatus.Archived)]
    public void Submit_FromInvalidStatus_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.Submit(actorUserId: 42);

        act.Should().Throw<InvalidOperationException>();
    }

    // ---------- ApproveByFinance ----------

    [Fact]
    public void ApproveByFinance_FromPendingFinance_GoesToPendingCfo()
    {
        var version = NewDraft();
        version.Submit(42);

        version.ApproveByFinance(actorUserId: 43);

        version.Status.Should().Be(BudgetVersionStatus.PendingCfo);
        version.FinanceApprovedByUserId.Should().Be(43);
        version.FinanceApprovedAt.Should().NotBeNull();
    }

    [Theory]
    [InlineData(BudgetVersionStatus.Draft)]
    [InlineData(BudgetVersionStatus.PendingCfo)]
    [InlineData(BudgetVersionStatus.Active)]
    [InlineData(BudgetVersionStatus.Rejected)]
    [InlineData(BudgetVersionStatus.Archived)]
    public void ApproveByFinance_FromNonPendingFinance_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.ApproveByFinance(actorUserId: 43);

        act.Should().Throw<InvalidOperationException>();
    }

    // ---------- ApproveByCfoAndActivate ----------

    [Fact]
    public void ApproveByCfoAndActivate_FromPendingCfo_NoExistingActive_MarksActive()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByFinance(43);

        version.ApproveByCfoAndActivate(actorUserId: 44, currentActive: null);

        version.Status.Should().Be(BudgetVersionStatus.Active);
        version.IsActive.Should().BeTrue();
        version.ActivatedByUserId.Should().Be(44);
        version.CfoApprovedByUserId.Should().Be(44);
    }

    [Fact]
    public void ApproveByCfoAndActivate_WithExistingActive_ArchivesOld()
    {
        var oldActive = NewDraft();
        oldActive.ForceActivate();

        var newVersion = NewDraft();
        newVersion.Submit(42);
        newVersion.ApproveByFinance(43);

        newVersion.ApproveByCfoAndActivate(actorUserId: 44, currentActive: oldActive);

        newVersion.Status.Should().Be(BudgetVersionStatus.Active);
        newVersion.IsActive.Should().BeTrue();
        oldActive.Status.Should().Be(BudgetVersionStatus.Archived);
        oldActive.IsActive.Should().BeFalse();
    }

    [Fact]
    public void ApproveByCfoAndActivate_SameInstanceAsCurrentActive_Throws()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByFinance(43);

        var act = () => version.ApproveByCfoAndActivate(44, currentActive: version);

        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(BudgetVersionStatus.Draft)]
    [InlineData(BudgetVersionStatus.PendingFinance)]
    [InlineData(BudgetVersionStatus.Active)]
    [InlineData(BudgetVersionStatus.Rejected)]
    [InlineData(BudgetVersionStatus.Archived)]
    public void ApproveByCfoAndActivate_FromNonPendingCfo_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.ApproveByCfoAndActivate(44, currentActive: null);

        act.Should().Throw<InvalidOperationException>();
    }

    // ---------- Reject ----------

    [Fact]
    public void Reject_FromPendingFinance_GoesToRejectedWithReason()
    {
        var version = NewDraft();
        version.Submit(42);

        version.Reject(actorUserId: 43, reason: "Eksik hasar planı");

        version.Status.Should().Be(BudgetVersionStatus.Rejected);
        version.RejectionReason.Should().Be("Eksik hasar planı");
    }

    [Fact]
    public void Reject_FromPendingCfo_GoesToRejected()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByFinance(43);

        version.Reject(actorUserId: 44, reason: "CFO düzeltme istedi");

        version.Status.Should().Be(BudgetVersionStatus.Rejected);
    }

    [Theory]
    [InlineData(BudgetVersionStatus.Draft)]
    [InlineData(BudgetVersionStatus.Active)]
    [InlineData(BudgetVersionStatus.Archived)]
    [InlineData(BudgetVersionStatus.Rejected)]
    public void Reject_FromInvalidStatus_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.Reject(42, "reason");

        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Reject_WithoutReason_Throws(string badReason)
    {
        var version = NewDraft();
        version.Submit(42);

        var act = () => version.Reject(43, badReason);

        act.Should().Throw<ArgumentException>();
    }

    // ---------- Archive ----------

    [Fact]
    public void Archive_FromActive_GoesToArchived()
    {
        var version = NewDraft();
        version.Submit(42);
        version.ApproveByFinance(43);
        version.ApproveByCfoAndActivate(44, currentActive: null);

        version.Archive(actorUserId: 45);

        version.Status.Should().Be(BudgetVersionStatus.Archived);
        version.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData(BudgetVersionStatus.Draft)]
    [InlineData(BudgetVersionStatus.PendingFinance)]
    [InlineData(BudgetVersionStatus.PendingCfo)]
    [InlineData(BudgetVersionStatus.Rejected)]
    [InlineData(BudgetVersionStatus.Archived)]
    public void Archive_FromNonActive_Throws(BudgetVersionStatus from)
    {
        var version = NewDraft();
        version.ForceStatus(from);

        var act = () => version.Archive(42);

        act.Should().Throw<InvalidOperationException>();
    }

    // ---------- Full happy path ----------

    [Fact]
    public void ApprovalChain_DraftToActive_Succeeds()
    {
        var version = NewDraft();

        version.Submit(42);
        version.ApproveByFinance(43);
        version.ApproveByCfoAndActivate(44, currentActive: null);

        version.Status.Should().Be(BudgetVersionStatus.Active);
        version.IsActive.Should().BeTrue();
    }
}
