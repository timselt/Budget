using BudgetTracker.Application.Authorization;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Authorization;

public sealed class SegregationOfDutiesGuardTests
{
    private readonly SegregationOfDutiesGuard _guard = new();

    [Fact]
    public void EnsureDifferentActor_WhenCreatorEqualsApprover_ThrowsSegregationOfDutiesException()
    {
        // Arrange
        const int sameUserId = 42;
        const string action = "PriceBook.Approve";

        // Act
        var act = () => _guard.EnsureDifferentActor(sameUserId, sameUserId, action);

        // Assert
        act.Should().Throw<SegregationOfDutiesException>()
            .Which.Message.Should().Contain(action)
            .And.Contain(sameUserId.ToString());
    }

    [Fact]
    public void EnsureDifferentActor_WhenCreatorDiffersFromApprover_DoesNotThrow()
    {
        // Arrange
        const int creatorUserId = 1;
        const int approverUserId = 2;

        // Act
        var act = () => _guard.EnsureDifferentActor(creatorUserId, approverUserId, "Reconciliation.ExportAccounting");

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureDifferentActor_WhenActorsDifferOnlyByOne_DoesNotThrow()
    {
        // Arrange — boundary: ardışık kullanıcı id'leri ayrı kişiler
        const int creatorUserId = 99;
        const int approverUserId = 100;

        // Act
        var act = () => _guard.EnsureDifferentActor(creatorUserId, approverUserId, "PriceBook.Approve");

        // Assert
        act.Should().NotThrow();
    }
}
