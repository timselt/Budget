using System.Reflection;
using BudgetTracker.Api.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;

namespace BudgetTracker.UnitTests.Api;

/// <summary>
/// Task 2 (D.2 cleanup) — her controller action'ı için <c>[Authorize(Policy = ...)]</c>
/// attribute'unun spec 00b §3 + 00c §4 ile tam uyumunu doğrular. Sprint 1'deki
/// eski alias isimlendirmesinin (<c>RequireFinanceRole</c>, <c>Cfo</c>) spec'teki
/// semantik policy'lere (<c>PriceBook.Edit</c>, <c>PriceBook.Approve</c>) taşınması.
///
/// HTTP roundtrip (WebApplicationFactory) hâlâ ertelendi — Sprint 2 Task 7'de
/// Reconciliation Cases API HTTP infra'sı kurulunca burada doğrulanan her mapping
/// canlı 200/403 testine genişletilecek.
/// </summary>
public sealed class ControllerPolicyAttributeTests
{
    private static string? PolicyFor(Type controller, string methodName, params Type[] paramTypes)
    {
        var method = paramTypes.Length == 0
            ? controller.GetMethods(BindingFlags.Instance | BindingFlags.Public)
                .Single(m => m.Name == methodName)
            : controller.GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public, paramTypes)
                ?? throw new InvalidOperationException($"{controller.Name}.{methodName} bulunamadı");
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        return attr?.Policy;
    }

    // --- PriceBooksController (spec 00b §3.2 + 00c §4) ---

    [Fact]
    public void PriceBooksController_CreateDraft_RequiresPriceBookEdit()
    {
        PolicyFor(typeof(PriceBooksController), nameof(PriceBooksController.CreateDraft))
            .Should().Be("PriceBook.Edit",
                because: "spec 00c §4 — ReconAgent Draft PriceBook üretebilir");
    }

    [Fact]
    public void PriceBooksController_BulkAddItems_RequiresPriceBookEdit()
    {
        PolicyFor(typeof(PriceBooksController), nameof(PriceBooksController.BulkAddItems))
            .Should().Be("PriceBook.Edit");
    }

    [Fact]
    public void PriceBooksController_ImportCsv_RequiresPriceBookEdit()
    {
        PolicyFor(typeof(PriceBooksController), nameof(PriceBooksController.ImportCsv))
            .Should().Be("PriceBook.Edit");
    }

    [Fact]
    public void PriceBooksController_Approve_RequiresPriceBookApprove()
    {
        PolicyFor(typeof(PriceBooksController), nameof(PriceBooksController.Approve))
            .Should().Be("PriceBook.Approve",
                because: "spec 00c §4 — onay yalnızca Admin+Cfo, ReconAgent hariç (SoD)");
    }

    // --- ContractsController (spec 00c §3 matrix — Contract onayı Admin+Cfo) ---

    [Fact]
    public void ContractsController_Activate_RequiresCfoPolicy()
    {
        PolicyFor(typeof(ContractsController), nameof(ContractsController.Activate))
            .Should().Be("Cfo",
                because: "spec 00c §3 matrix — 'Contract / PriceBook onayı' sadece Admin+Cfo; " +
                         "mevcut 'Cfo' policy'si (Admin+Cfo) semantik olarak tam uyumlu");
    }

    [Fact]
    public void ContractsController_Terminate_RequiresCfoPolicy()
    {
        PolicyFor(typeof(ContractsController), nameof(ContractsController.Terminate))
            .Should().Be("Cfo");
    }

    // --- ContractsController diğer CRUD action'lar (RequireFinanceRole alias hâlâ geçerli) ---
    // Admin + FinanceManager — spec 00c §3 matrix'te Contract CRUD için ayrı satır yok,
    // "general finance CRUD" varsayılanı: bu controller için RequireFinanceRole doğru.

    [Theory]
    [InlineData(nameof(ContractsController.Create))]
    [InlineData(nameof(ContractsController.Update))]
    [InlineData(nameof(ContractsController.Revise))]
    [InlineData(nameof(ContractsController.Delete))]
    public void ContractsController_CrudActions_RequireFinanceRole(string methodName)
    {
        PolicyFor(typeof(ContractsController), methodName)
            .Should().Be("RequireFinanceRole",
                because: "spec 00c §3 — Contract CRUD matrix'te ayrı yok; " +
                         "implicit 'general finance CRUD' — Admin+FM (RequireFinanceRole)");
    }
}
