using BudgetTracker.Core.Entities.Reconciliation;
using BudgetTracker.Core.Enums.Reconciliation;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Cases;

/// <summary>
/// Sprint 2 Task 12 — ReconciliationCase state machine geçişleri.
/// Domain seviyesinde enforce edilir; servis katmanı InvalidCaseTransitionException
/// yakalayıp 409 döner.
/// </summary>
public sealed class CaseStateMachineTests
{
    private static ReconciliationCase MakeCase(int ownerUserId = 1) =>
        ReconciliationCase.CreateDraft(
            companyId: 1,
            flow: ReconciliationFlow.Insurance,
            periodCode: "2026-04",
            customerId: 10,
            ownerUserId: ownerUserId,
            openedAt: DateTimeOffset.UtcNow);

    [Fact]
    public void AssignOwner_FromDraft_TransitionsToUnderControl()
    {
        var kase = MakeCase();
        kase.Status.Should().Be(ReconciliationCaseStatus.Draft);

        kase.AssignOwner(newOwnerUserId: 2, DateTimeOffset.UtcNow);

        kase.Status.Should().Be(ReconciliationCaseStatus.UnderControl);
        kase.OwnerUserId.Should().Be(2);
    }

    [Fact]
    public void AssignOwner_IdempotentOnUnderControl_KeepsStatus()
    {
        var kase = MakeCase();
        kase.AssignOwner(2, DateTimeOffset.UtcNow);

        // Aynı case'e ikinci kez owner atama → Status UnderControl kalır
        kase.AssignOwner(3, DateTimeOffset.UtcNow);

        kase.Status.Should().Be(ReconciliationCaseStatus.UnderControl);
        kase.OwnerUserId.Should().Be(3);
    }

    [Fact]
    public void MarkPricingMatched_FromUnderControl_AllLinesReady_TransitionsOk()
    {
        var kase = MakeCase();
        kase.AssignOwner(2, DateTimeOffset.UtcNow);

        kase.MarkPricingMatched(allLinesReady: true, DateTimeOffset.UtcNow);

        kase.Status.Should().Be(ReconciliationCaseStatus.PricingMatched);
    }

    [Fact]
    public void MarkPricingMatched_FromUnderControl_NotAllReady_Throws()
    {
        var kase = MakeCase();
        kase.AssignOwner(2, DateTimeOffset.UtcNow);

        var act = () => kase.MarkPricingMatched(allLinesReady: false, DateTimeOffset.UtcNow);

        act.Should().Throw<InvalidCaseTransitionException>()
            .Which.To.Should().Be(ReconciliationCaseStatus.PricingMatched);
    }

    [Fact]
    public void MarkPricingMatched_FromDraft_Throws()
    {
        var kase = MakeCase();
        // Not: owner atanmadığı için Status Draft kalır.

        var act = () => kase.MarkPricingMatched(allLinesReady: true, DateTimeOffset.UtcNow);

        act.Should().Throw<InvalidCaseTransitionException>()
            .Which.From.Should().Be(ReconciliationCaseStatus.Draft);
    }
}
