using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class BudgetApprovalTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 1, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_DefaultsPending()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.DeptHead, 1, Now);

        approval.Decision.Should().Be(ApprovalDecision.Pending);
        approval.ApproverId.Should().BeNull();
        approval.DecidedAt.Should().BeNull();
        approval.Stage.Should().Be(ApprovalStage.DeptHead);
        approval.StageOrder.Should().Be(1);
    }

    [Fact]
    public void Approve_SetsDecisionAndActor()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.Finance, 2, Now);
        var decidedAt = Now.AddHours(2);

        approval.Approve(5, decidedAt, "looks good");

        approval.Decision.Should().Be(ApprovalDecision.Approved);
        approval.ApproverId.Should().Be(5);
        approval.DecidedAt.Should().Be(decidedAt);
        approval.Comment.Should().Be("looks good");
    }

    [Fact]
    public void Reject_RequiresReason()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.Cfo, 3, Now);

        var act = () => approval.Reject(5, "", Now);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Reject_SetsDecisionAndReason()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.Cfo, 3, Now);
        var decidedAt = Now.AddHours(1);

        approval.Reject(5, "numbers don't add up", decidedAt);

        approval.Decision.Should().Be(ApprovalDecision.Rejected);
        approval.ApproverId.Should().Be(5);
        approval.Comment.Should().Be("numbers don't add up");
    }

    [Fact]
    public void Approve_WhenAlreadyDecided_Throws()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.DeptHead, 1, Now);
        approval.Approve(5, Now);

        var act = () => approval.Approve(6, Now.AddHours(1));
        act.Should().Throw<InvalidOperationException>().WithMessage("*already decided*");
    }

    [Fact]
    public void Reject_WhenAlreadyApproved_Throws()
    {
        var approval = BudgetApproval.Create(1, 10, ApprovalStage.Finance, 2, Now);
        approval.Approve(5, Now);

        var act = () => approval.Reject(6, "too late", Now.AddHours(1));
        act.Should().Throw<InvalidOperationException>().WithMessage("*already decided*");
    }

    [Fact]
    public void Create_InvalidVersionId_Throws()
    {
        var act = () => BudgetApproval.Create(1, 0, ApprovalStage.DeptHead, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_InvalidCompanyId_Throws()
    {
        var act = () => BudgetApproval.Create(0, 10, ApprovalStage.DeptHead, 1, Now);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
