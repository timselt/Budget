using System.Security.Claims;
using BudgetTracker.Core.Identity;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetTracker.UnitTests.Application.Authorization;

/// <summary>
/// Mutabakat önkoşul #3 (00c) — RBAC policy değerlendirme testleri.
/// HTTP roundtrip'i (WebApplicationFactory) sprint 1'de Reconciliation
/// controller'ları eklendiğinde kurulacak (spec §9, ertelendi).
/// Burada policy mantığını izole edip ClaimsPrincipal seviyesinde doğruluyoruz.
/// </summary>
public sealed class ReconAgentRolePolicyTests
{
    private readonly IAuthorizationService _authService;

    public ReconAgentRolePolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
        {
            // Spec §4 — 00c'de eklenen Reconciliation policy'lerinin alt kümesi.
            // AuthenticationExtensions'taki tanımlarla birebir aynı; spec değişirse
            // iki yerde de güncellenir (test koruyucu olarak çalışsın diye).
            options.AddPolicy("Reconciliation.Import", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.Manage", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.SendToCustomer", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.ExportAccounting", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager));
            options.AddPolicy("Reconciliation.AckAccounting", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager));
            options.AddPolicy("Reconciliation.ConfigRisk", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo));
            options.AddPolicy("PriceBook.Edit", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("PriceBook.Approve", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo));
        });

        var sp = services.BuildServiceProvider();
        _authService = sp.GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal UserWithRole(string role) =>
        new(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role) }, authenticationType: "Test"));

    [Fact]
    public async Task ExportAccounting_WithReconAgentRole_IsDenied()
    {
        // Arrange
        var user = UserWithRole(RoleNames.ReconAgent);

        // Act
        var result = await _authService.AuthorizeAsync(user, resource: null, "Reconciliation.ExportAccounting");

        // Assert — görev ayrılığı: muhasebe export'u Finance/CFO/Admin'e ait.
        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task ExportAccounting_WithFinanceManagerRole_IsAllowed()
    {
        var user = UserWithRole(RoleNames.FinanceManager);

        var result = await _authService.AuthorizeAsync(user, resource: null, "Reconciliation.ExportAccounting");

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task ReconciliationManage_WithReconAgentRole_IsAllowed()
    {
        var user = UserWithRole(RoleNames.ReconAgent);

        var result = await _authService.AuthorizeAsync(user, resource: null, "Reconciliation.Manage");

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task SendToCustomer_WithReconAgentRole_IsAllowed()
    {
        var user = UserWithRole(RoleNames.ReconAgent);

        var result = await _authService.AuthorizeAsync(user, resource: null, "Reconciliation.SendToCustomer");

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task PriceBookApprove_WithReconAgentRole_IsDenied()
    {
        // Görev ayrılığı: ReconAgent PriceBook draft girer ama onaylayamaz.
        var user = UserWithRole(RoleNames.ReconAgent);

        var result = await _authService.AuthorizeAsync(user, resource: null, "PriceBook.Approve");

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task PriceBookEdit_WithReconAgentRole_IsAllowed()
    {
        // Spec 00c §4: ReconAgent PriceBook Draft/kalem girebilir.
        // D.2 cleanup sonrası PriceBooksController.CreateDraft/BulkAddItems/ImportCsv
        // bu policy'ye geçer — ReconAgent ilk kez draft PriceBook üretebilir.
        var user = UserWithRole(RoleNames.ReconAgent);

        var result = await _authService.AuthorizeAsync(user, resource: null, "PriceBook.Edit");

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task PriceBookEdit_WithCfoRole_IsDenied()
    {
        // Spec 00c §4: PriceBook.Edit üyeliği Admin + FM + ReconAgent — Cfo YOK.
        // Cfo sadece Approve yapabilir (görev ayrılığı: draft üreten ≠ onaylayan).
        var user = UserWithRole(RoleNames.Cfo);

        var result = await _authService.AuthorizeAsync(user, resource: null, "PriceBook.Edit");

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task PriceBookApprove_WithCfoRole_IsAllowed()
    {
        var user = UserWithRole(RoleNames.Cfo);

        var result = await _authService.AuthorizeAsync(user, resource: null, "PriceBook.Approve");

        result.Succeeded.Should().BeTrue();
    }

    [Theory]
    [InlineData("Reconciliation.Import")]
    [InlineData("Reconciliation.Manage")]
    [InlineData("Reconciliation.SendToCustomer")]
    [InlineData("Reconciliation.ExportAccounting")]
    [InlineData("Reconciliation.AckAccounting")]
    [InlineData("Reconciliation.ConfigRisk")]
    [InlineData("PriceBook.Edit")]
    [InlineData("PriceBook.Approve")]
    public async Task AllReconciliationAndPriceBookPolicies_WithAdminRole_AreAllowed(string policy)
    {
        // Admin tüm yetkileri taşır — regression koruması.
        var user = UserWithRole(RoleNames.Admin);

        var result = await _authService.AuthorizeAsync(user, resource: null, policy);

        result.Succeeded.Should().BeTrue($"Admin '{policy}' policy'sini geçmeli");
    }

    [Theory]
    [InlineData("Reconciliation.Import")]
    [InlineData("Reconciliation.Manage")]
    [InlineData("Reconciliation.ExportAccounting")]
    [InlineData("Reconciliation.AckAccounting")]
    [InlineData("Reconciliation.ConfigRisk")]
    [InlineData("PriceBook.Edit")]
    [InlineData("PriceBook.Approve")]
    public async Task AllPrivilegedPolicies_WithViewerRole_AreDenied(string policy)
    {
        // Viewer hiçbir mutabakat işlemi yapamaz (ViewReports hariç — o tüm authenticated user'lara açık).
        var user = UserWithRole(RoleNames.Viewer);

        var result = await _authService.AuthorizeAsync(user, resource: null, policy);

        result.Succeeded.Should().BeFalse($"Viewer '{policy}' policy'sini geçememeli");
    }
}
