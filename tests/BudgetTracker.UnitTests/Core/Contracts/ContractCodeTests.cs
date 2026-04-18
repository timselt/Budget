using BudgetTracker.Core.Contracts;
using BudgetTracker.Core.Enums.Contracts;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Contracts;

/// <summary>
/// Kontrat kodu üretim/parse doğrulaması (ADR-0014). Spec'teki 3 örnek
/// roundtrip (build→string→parse→build eşitliği) + edge case'ler. Not:
/// ADR-0014 §2.5 kararıyla ProductId 7-haneli olduğu için (spec tablosuna
/// uygun), test beklenen stringleri 33 karakter — user prompt'undaki
/// örneklerin 32 karakter formu (6 hane) typo kabul edildi.
/// </summary>
public sealed class ContractCodeTests
{
    // ----- Spec örnekleri (ADR-0014 §1) -----

    [Fact]
    public void Build_Example1_MapfreBinekKaskoRsa()
    {
        var code = ContractCode.Build(
            businessLine: BusinessLine.RoadSideAssistance,
            salesType: SalesType.Insurance,
            productType: ProductType.Kasko,
            vehicleType: VehicleType.Binek,
            customerShortId: 1,
            contractForm: ContractForm.Risky,
            contractType: ContractType.PerPolicy,
            productId: 1,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut,
            serviceArea: ServiceArea.Domestic,
            version: 1);

        code.Value.Should().Be("TA1SGK0B0001010100000013652CC1-V1");
    }

    [Fact]
    public void Build_Example2_KoruKonutAcil()
    {
        var code = ContractCode.Build(
            businessLine: BusinessLine.HomeAndWorkplace,
            salesType: SalesType.Insurance,
            productType: ProductType.KonutAcil,
            vehicleType: VehicleType.None,
            customerShortId: 2,
            contractForm: ContractForm.Risky,
            contractType: ContractType.PerPolicy,
            productId: 26,
            paymentFrequency: PaymentFrequency.Monthly,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.RunOff,
            serviceArea: ServiceArea.Domestic,
            version: 1);

        code.Value.Should().Be("TA3SGK10000201010000026T122RO1-V1");
    }

    [Fact]
    public void Build_Example3_MapfreYurtDisiKaskoTumAracTipleri()
    {
        var code = ContractCode.Build(
            businessLine: BusinessLine.RentACar,
            salesType: SalesType.Insurance,
            productType: ProductType.Kasko,
            vehicleType: VehicleType.BinekHafifAgir,
            customerShortId: 1,
            contractForm: ContractForm.ServiceBased,
            contractType: ContractType.PerPolicy,
            productId: 23,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut,
            serviceArea: ServiceArea.International,
            version: 1);

        code.Value.Should().Be("TA2SGK0BHF01020100000233652CC2-V1");
    }

    [Theory]
    [InlineData("TA1SGK0B0001010100000013652CC1-V1")]
    [InlineData("TA3SGK10000201010000026T122RO1-V1")]
    [InlineData("TA2SGK0BHF01020100000233652CC2-V1")]
    public void Parse_SpecExamples_RoundtripsToSameString(string raw)
    {
        var parsed = ContractCode.Parse(raw);

        parsed.Value.Should().Be(raw);
    }

    [Fact]
    public void Parse_PreservesAllSegmentsFromExample1()
    {
        var parsed = ContractCode.Parse("TA1SGK0B0001010100000013652CC1-V1");

        parsed.BusinessLine.Should().Be(BusinessLine.RoadSideAssistance);
        parsed.SalesType.Should().Be(SalesType.Insurance);
        parsed.ProductType.Should().Be(ProductType.Kasko);
        parsed.VehicleType.Should().Be(VehicleType.Binek);
        parsed.CustomerShortId.Should().Be(1);
        parsed.ContractForm.Should().Be(ContractForm.Risky);
        parsed.ContractType.Should().Be(ContractType.PerPolicy);
        parsed.ProductId.Should().Be(1);
        parsed.PaymentFrequency.Should().Be(PaymentFrequency.Daily);
        parsed.AdjustmentClause.Should().Be(AdjustmentClause.WithoutClause);
        parsed.ContractKind.Should().Be(ContractKind.CleanCut);
        parsed.ServiceArea.Should().Be(ServiceArea.Domestic);
        parsed.Version.Should().Be(1);
    }

    // ----- Format / length -----

    [Fact]
    public void Build_BodyIsExactly30Characters()
    {
        var code = BuildMinimal();

        var bodyLength = code.Value.IndexOf("-V", StringComparison.Ordinal);

        bodyLength.Should().Be(ContractCode.BodyLength);
    }

    [Fact]
    public void Build_AlwaysStartsWithTurAssistPrefix()
    {
        var code = BuildMinimal();

        code.Value.Should().StartWith("TA");
    }

    [Fact]
    public void Build_ProductIdIsZeroPaddedTo7Digits()
    {
        var code = BuildMinimal(productId: 42);

        code.Value.Should().Contain("0000042");
    }

    [Fact]
    public void Build_CustomerShortIdIsZeroPaddedTo2Digits()
    {
        var code = BuildMinimal(customerShortId: 7);

        // "...K0000070101..." — 07 olmalı, 7 değil
        code.Value.Substring(10, 2).Should().Be("07");
    }

    // ----- Payment frequency T365 ↔ 365 çift kabul (ADR-0014 §2.7) -----

    [Fact]
    public void Build_DailyPaymentRendersWithoutTPrefix()
    {
        var code = BuildMinimal(paymentFrequency: PaymentFrequency.Daily);

        code.Value.Substring(23, 3).Should().Be("365");
    }

    [Fact]
    public void Parse_AcceptsTPrefixedDailyPaymentAndNormalizesTo365()
    {
        // Body'de T365 varsa (4 karakter) toplam 31 char olur — body 30
        // olmalı dedik, yani bu input geçersiz. Ancak segment parser'ının
        // kendisi hem "T365" hem "365" kabul ediyor — içsel doğrulama testi.
        var result = ContractSegmentCodes.ParsePaymentFrequency("T365");

        result.Should().Be(PaymentFrequency.Daily);
    }

    // ----- BumpVersion -----

    [Fact]
    public void BumpVersion_IncrementsVersionOnly()
    {
        var v1 = BuildMinimal(version: 1);

        var v2 = v1.BumpVersion();

        v2.Version.Should().Be(2);
        v2.Value.Should().EndWith("-V2");
        v2.ProductId.Should().Be(v1.ProductId);
        v2.CustomerShortId.Should().Be(v1.CustomerShortId);
    }

    // ----- Geçersiz input -----

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_RejectsEmptyInput(string input)
    {
        var act = () => ContractCode.Parse(input);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Parse_RejectsMissingVersionSuffix()
    {
        var act = () => ContractCode.Parse("TA1SGK0B000101010000013652CC1");

        act.Should().Throw<ArgumentException>().WithMessage("*-V*");
    }

    [Fact]
    public void Parse_RejectsWrongBodyLength()
    {
        var act = () => ContractCode.Parse("TA1SG-V1");

        act.Should().Throw<ArgumentException>().WithMessage("*30*");
    }

    [Fact]
    public void Parse_RejectsNonTurAssistPrefix()
    {
        var act = () => ContractCode.Parse("XX1SGK0B0001010100000013652CC1-V1");

        act.Should().Throw<ArgumentException>().WithMessage("*TA*");
    }

    [Fact]
    public void Parse_RejectsZeroVersion()
    {
        var act = () => ContractCode.Parse("TA1SGK0B0001010100000013652CC1-V0");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Parse_RejectsZeroProductId()
    {
        // ProductId segmenti 0000000 (7 sıfır) — parse 1<= istiyor, ret.
        var act = () => ContractCode.Parse("TA1SGK0B00010101000000036522CC1-V1");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Build_RejectsCustomerShortIdAbove99()
    {
        var act = () => BuildMinimal(customerShortId: 100);

        act.Should().Throw<ArgumentOutOfRangeException>().WithMessage("*2-digit*");
    }

    [Fact]
    public void Build_RejectsCustomerShortIdBelowZero()
    {
        var act = () => BuildMinimal(customerShortId: -1);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Build_RejectsProductIdAbove7Digits()
    {
        var act = () => BuildMinimal(productId: 10_000_000);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Build_RejectsZeroProductId()
    {
        var act = () => BuildMinimal(productId: 0);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Build_RejectsZeroVersion()
    {
        var act = () => BuildMinimal(version: 0);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    // ----- Yardımcı -----

    private static ContractCode BuildMinimal(
        int customerShortId = 1,
        int productId = 1,
        int version = 1,
        PaymentFrequency paymentFrequency = PaymentFrequency.UpFront) =>
        ContractCode.Build(
            BusinessLine.Other,
            SalesType.Insurance,
            ProductType.Diger,
            VehicleType.None,
            customerShortId,
            ContractForm.Risky,
            ContractType.PerPolicy,
            productId,
            paymentFrequency,
            AdjustmentClause.WithoutClause,
            ContractKind.CleanCut,
            ServiceArea.Domestic,
            version);
}
