using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Enums.Reconciliation;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

public sealed class TemplateRowValidatorTests
{
    private static readonly TemplateRowValidator InsuranceValidator =
        new(ReconciliationTemplates.Insurance);

    private static readonly TemplateRowValidator AutomotiveValidator =
        new(ReconciliationTemplates.Automotive);

    private static IReadOnlyDictionary<string, string?> InsuranceRow(
        string? policy = "POL-001",
        string? insured = "Ali Ahmet",
        string? productCode = "KSK-STD",
        string? productName = "Kasko Standart",
        string? quantity = "1",
        string? unitPrice = null,
        string? period = "2026-04",
        string? customerRef = "LOGO-100",
        string? notes = null)
        => new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["policy_no"] = policy,
            ["insured_party_name"] = insured,
            ["product_code"] = productCode,
            ["product_name"] = productName,
            ["quantity"] = quantity,
            ["unit_price_expected"] = unitPrice,
            ["period_code"] = period,
            ["external_customer_ref"] = customerRef,
            ["notes"] = notes,
        };

    [Fact]
    public void Validate_AllRequiredFilled_ReturnsOk()
    {
        var result = InsuranceValidator.Validate(InsuranceRow());
        result.Status.Should().Be(ReconciliationParseStatus.Ok);
        result.ParseErrorsJson.Should().BeNull();
        result.ExternalCustomerRef.Should().Be("LOGO-100");
        result.ExternalDocumentRef.Should().Be("POL-001");
    }

    [Fact]
    public void Validate_MissingRequiredField_ReturnsError()
    {
        var result = InsuranceValidator.Validate(InsuranceRow(policy: null));
        result.Status.Should().Be(ReconciliationParseStatus.Error);
        result.ParseErrorsJson.Should().Contain("REQUIRED_MISSING");
        result.ParseErrorsJson.Should().Contain("policy_no");
    }

    [Fact]
    public void Validate_OptionalFieldParseFailure_ReturnsWarning()
    {
        // unit_price_expected geçersiz → warning, satır devam
        var result = InsuranceValidator.Validate(InsuranceRow(unitPrice: "not-a-number"));
        result.Status.Should().Be(ReconciliationParseStatus.Warning);
        result.ParseErrorsJson.Should().Contain("TYPE_PARSE_ERROR");
    }

    [Fact]
    public void Validate_RequiredFieldParseFailure_ReturnsError()
    {
        // quantity geçersiz → error
        var result = InsuranceValidator.Validate(InsuranceRow(quantity: "not-an-int"));
        result.Status.Should().Be(ReconciliationParseStatus.Error);
        result.ParseErrorsJson.Should().Contain("TYPE_PARSE_ERROR");
        result.ParseErrorsJson.Should().Contain("quantity");
    }

    [Fact]
    public void Validate_InvalidPeriodCode_ReturnsError()
    {
        var result = InsuranceValidator.Validate(InsuranceRow(period: "2026/04"));
        result.Status.Should().Be(ReconciliationParseStatus.Error);
        result.ParseErrorsJson.Should().Contain("period_code");
    }

    [Fact]
    public void Validate_TrLocaleDecimal_ParsesCorrectly()
    {
        var result = InsuranceValidator.Validate(InsuranceRow(unitPrice: "1.234,56"));
        result.Status.Should().Be(ReconciliationParseStatus.Ok);
        result.CanonicalRow["unit_price_expected"].Should().Be(1234.56m);
    }

    [Fact]
    public void Validate_OptionalNotesMissing_NoIssue()
    {
        var result = InsuranceValidator.Validate(InsuranceRow(notes: null));
        result.Status.Should().Be(ReconciliationParseStatus.Ok);
    }

    [Fact]
    public void Validate_AutomotiveRow_RecognizesCaseRefAsDocumentRef()
    {
        var row = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["case_ref"] = "TARS-9001",
            ["service_code"] = "TOW-1",
            ["service_name"] = "Çekici",
            ["usage_count"] = "2",
            ["service_date"] = "2026-04-15",
            ["dealer_code"] = "BAYI-50",
            ["period_code"] = "2026-04",
            ["external_customer_ref"] = "OEM-XYZ",
            ["power_bi_query_ref"] = null,
        };
        var result = AutomotiveValidator.Validate(row);
        result.Status.Should().Be(ReconciliationParseStatus.Ok);
        result.ExternalDocumentRef.Should().Be("TARS-9001");
        result.CanonicalRow["service_date"].Should().Be(new DateOnly(2026, 4, 15));
    }

    [Fact]
    public void Validate_AutomotiveDateInTrFormat_ParsesCorrectly()
    {
        var row = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["case_ref"] = "TARS-9002",
            ["service_code"] = "TOW-2",
            ["service_name"] = "İkame Araç",
            ["usage_count"] = "1",
            ["service_date"] = "15.04.2026",        // TR
            ["dealer_code"] = "BAYI-50",
            ["period_code"] = "2026-04",
            ["external_customer_ref"] = "OEM-XYZ",
            ["power_bi_query_ref"] = null,
        };
        var result = AutomotiveValidator.Validate(row);
        result.Status.Should().Be(ReconciliationParseStatus.Ok);
        result.CanonicalRow["service_date"].Should().Be(new DateOnly(2026, 4, 15));
    }

    [Fact]
    public void Validate_RawPayloadJson_SerializesCanonicalNames()
    {
        var result = InsuranceValidator.Validate(InsuranceRow());
        result.RawPayloadJson.Should().Contain("\"policy_no\":\"POL-001\"");
        result.RawPayloadJson.Should().Contain("\"product_code\":\"KSK-STD\"");
        result.RawPayloadJson.Should().Contain("\"period_code\":\"2026-04\"");
    }
}
