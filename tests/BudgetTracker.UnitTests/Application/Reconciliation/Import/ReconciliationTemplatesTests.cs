using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Enums.Reconciliation;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

/// <summary>
/// ADR-0017 — 4 akış (Insurance, Automotive, Filo, Alternatif) için
/// <see cref="ReconciliationTemplates.ForFlow"/> factory çağrısı doğru
/// şablonu dönmeli. Pilot Filo + Alternatif şablonları placeholder
/// yapıda; gerçek veri geldiğinde kolonlar iyileştirilecek.
/// </summary>
public sealed class ReconciliationTemplatesTests
{
    [Theory]
    [InlineData(ReconciliationFlow.Insurance)]
    [InlineData(ReconciliationFlow.Automotive)]
    [InlineData(ReconciliationFlow.Filo)]
    [InlineData(ReconciliationFlow.Alternatif)]
    public void ForFlow_ReturnsTemplateForAllSupportedFlows(ReconciliationFlow flow)
    {
        var template = ReconciliationTemplates.ForFlow(flow);

        template.Should().NotBeNull();
        template.Flow.Should().Be(flow);
        template.Columns.Should().NotBeEmpty();
    }

    [Fact]
    public void Filo_Template_HasRequiredFleetColumns()
    {
        var template = ReconciliationTemplates.Filo;
        var columnKeys = template.Columns.Select(c => c.CanonicalName).ToHashSet();

        columnKeys.Should().Contain(new[] { "case_ref", "service_code", "usage_count", "fleet_code", "period_code", "external_customer_ref" });
    }

    [Fact]
    public void Alternatif_Template_HasRequiredReferenceColumns()
    {
        var template = ReconciliationTemplates.Alternatif;
        var columnKeys = template.Columns.Select(c => c.CanonicalName).ToHashSet();

        columnKeys.Should().Contain(new[] { "reference_no", "product_code", "quantity", "period_code", "external_customer_ref" });
    }

    [Fact]
    public void ForFlow_UndefinedValue_Throws()
    {
        Action act = () => ReconciliationTemplates.ForFlow((ReconciliationFlow)999);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
