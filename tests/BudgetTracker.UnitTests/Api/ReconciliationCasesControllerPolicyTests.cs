using System.Reflection;
using BudgetTracker.Api.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;

namespace BudgetTracker.UnitTests.Api;

/// <summary>
/// Sprint 2 Task 7 — ReconciliationCasesController action'larının spec 00c
/// policy mapping'ine uyumunu reflection ile doğrular. HTTP WAF testleri
/// Task 13 sonrasında eklenecek (WAF infra henüz yok).
/// </summary>
public sealed class ReconciliationCasesControllerPolicyTests
{
    private static string? PolicyFor(string methodName)
    {
        var method = typeof(ReconciliationCasesController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(m => m.Name == methodName);
        return method.GetCustomAttribute<AuthorizeAttribute>()?.Policy;
    }

    [Theory]
    [InlineData(nameof(ReconciliationCasesController.List))]
    [InlineData(nameof(ReconciliationCasesController.GetById))]
    public void ReadEndpoints_RequireViewReports(string methodName)
    {
        PolicyFor(methodName).Should().Be("Reconciliation.ViewReports",
            because: "salt okur, tüm authenticated user erişebilir");
    }

    [Theory]
    [InlineData(nameof(ReconciliationCasesController.AssignOwner))]
    [InlineData(nameof(ReconciliationCasesController.UpdateLine))]
    [InlineData(nameof(ReconciliationCasesController.MarkLineReady))]
    public void MutationEndpoints_RequireManagePolicy(string methodName)
    {
        PolicyFor(methodName).Should().Be("Reconciliation.Manage",
            because: "spec 00c §3 matrix — Case mutations Admin+FM+ReconAgent");
    }
}
