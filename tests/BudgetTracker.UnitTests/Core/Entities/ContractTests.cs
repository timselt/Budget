using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Contracts;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Core.Entities;

public sealed class ContractTests
{
    [Fact]
    public void Create_ProducesValidContractCode_ForVersion1()
    {
        var contract = MinimalContract();

        contract.Version.Should().Be(1);
        contract.RevisionCount.Should().Be(0);
        contract.ContractCode.Should().StartWith("TA").And.EndWith("-V1");
    }

    [Fact]
    public void BumpVersion_IncrementsVersionAndRegeneratesCode()
    {
        var contract = MinimalContract();
        var v1Code = contract.ContractCode;

        contract.BumpVersion(actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        contract.Version.Should().Be(2);
        contract.RevisionCount.Should().Be(1);
        contract.ContractCode.Should().NotBe(v1Code);
        contract.ContractCode.Should().EndWith("-V2");
    }

    [Fact]
    public void RevisePriceOnly_UpdatesPriceAndBumpsRevisionButKeepsVersion()
    {
        var contract = MinimalContract();
        var originalCode = contract.ContractCode;

        contract.RevisePriceOnly(
            newUnitPriceTry: 250m, actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        contract.Version.Should().Be(1);
        contract.RevisionCount.Should().Be(1);
        contract.UnitPriceTry.Should().Be(250m);
        contract.ContractCode.Should().Be(originalCode);
    }

    [Fact]
    public void ReviseMetadata_ChangesSegmentAndRegeneratesCode()
    {
        var contract = MinimalContract();
        var originalCode = contract.ContractCode;

        contract.ReviseMetadata(
            actorUserId: 1, updatedAt: DateTimeOffset.UtcNow,
            vehicleType: VehicleType.BinekHafifAgir);

        contract.VehicleType.Should().Be(VehicleType.BinekHafifAgir);
        contract.ContractCode.Should().NotBe(originalCode);
        contract.Version.Should().Be(1); // metadata revision versiyonu atlatmaz
    }

    [Fact]
    public void SyncCustomerShortId_UpdatesCustomerSegmentInCode()
    {
        var contract = MinimalContract(customerShortId: 1);
        var originalSegment = contract.ContractCode.Substring(10, 2);

        contract.SyncCustomerShortId(
            newShortId: 42, actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        contract.CustomerShortId.Should().Be(42);
        var newSegment = contract.ContractCode.Substring(10, 2);
        newSegment.Should().Be("42").And.NotBe(originalSegment);
    }

    [Fact]
    public void CreateFromLegacy_AppliesSaneDefaults()
    {
        var contract = Contract.CreateFromLegacy(
            companyId: 1, customerId: 1, customerShortId: 1, productId: 1,
            createdAt: DateTimeOffset.UtcNow,
            unitPriceTry: 100m, startDate: null, endDate: null,
            notes: "legacy", isActive: true);

        contract.BusinessLine.Should().Be(BusinessLine.Other);
        contract.SalesType.Should().Be(SalesType.Insurance);
        contract.ContractKind.Should().Be(ContractKind.CleanCut);
        contract.ServiceArea.Should().Be(ServiceArea.Domestic);
        contract.IsActive.Should().BeTrue();
    }

    [Fact]
    public void CreateFromLegacy_InactiveFlagPreserved()
    {
        var contract = Contract.CreateFromLegacy(
            companyId: 1, customerId: 1, customerShortId: 1, productId: 1,
            createdAt: DateTimeOffset.UtcNow,
            unitPriceTry: null, startDate: null, endDate: null,
            notes: null, isActive: false);

        contract.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Create_RejectsNegativeUnitPrice()
    {
        var act = () => MinimalContract(unitPriceTry: -1m);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_RejectsInvalidDateRange()
    {
        var act = () => MinimalContract(
            startDate: new DateOnly(2026, 12, 31),
            endDate: new DateOnly(2026, 1, 1));

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_RejectsShortIdAbove99()
    {
        var act = () => MinimalContract(customerShortId: 100);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    // ----- 00b Mutabakat lifecycle testleri -----

    [Fact]
    public void Create_DefaultsCurrencyToTryAndStatusActive()
    {
        var contract = MinimalContract();

        contract.CurrencyCode.Should().Be("TRY");
        contract.Status.Should().Be(ContractStatus.Active);
        contract.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Create_AsDraft_DoesNotSetIsActive()
    {
        var contract = Contract.Create(
            companyId: 1, customerId: 1, customerShortId: 1, productId: 1,
            businessLine: BusinessLine.RoadSideAssistance,
            salesType: SalesType.Insurance,
            productType: BudgetTracker.Core.Enums.Contracts.ProductType.Kasko,
            vehicleType: VehicleType.Binek,
            contractForm: ContractForm.Risky,
            contractType: BudgetTracker.Core.Enums.Contracts.ContractType.PerPolicy,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut,
            serviceArea: ServiceArea.Domestic,
            createdAt: DateTimeOffset.UtcNow,
            initialStatus: ContractStatus.Draft);

        contract.Status.Should().Be(ContractStatus.Draft);
        contract.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_RequiresStartDate()
    {
        var contract = MinimalContract();
        // Fabrikadan çıkan default Active — bunu Draft'a indirmek için yeni örnek.
        var draft = Contract.Create(
            companyId: 1, customerId: 1, customerShortId: 1, productId: 1,
            businessLine: BusinessLine.RoadSideAssistance, salesType: SalesType.Insurance,
            productType: BudgetTracker.Core.Enums.Contracts.ProductType.Kasko,
            vehicleType: VehicleType.Binek, contractForm: ContractForm.Risky,
            contractType: BudgetTracker.Core.Enums.Contracts.ContractType.PerPolicy,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut, serviceArea: ServiceArea.Domestic,
            createdAt: DateTimeOffset.UtcNow, initialStatus: ContractStatus.Draft);

        var act = () => draft.Activate(actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);
        act.Should().Throw<InvalidOperationException>().WithMessage("*StartDate*");
    }

    [Fact]
    public void Activate_DraftToActive_WithStartDate_Succeeds()
    {
        var draft = Contract.Create(
            companyId: 1, customerId: 1, customerShortId: 1, productId: 1,
            businessLine: BusinessLine.RoadSideAssistance, salesType: SalesType.Insurance,
            productType: BudgetTracker.Core.Enums.Contracts.ProductType.Kasko,
            vehicleType: VehicleType.Binek, contractForm: ContractForm.Risky,
            contractType: BudgetTracker.Core.Enums.Contracts.ContractType.PerPolicy,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut, serviceArea: ServiceArea.Domestic,
            createdAt: DateTimeOffset.UtcNow, initialStatus: ContractStatus.Draft,
            startDate: new DateOnly(2026, 1, 1));

        draft.Activate(actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        draft.Status.Should().Be(ContractStatus.Active);
        draft.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Terminate_Active_SetsStatusAndReason()
    {
        var contract = MinimalContract(startDate: new DateOnly(2026, 1, 1));

        contract.Terminate(
            reason: "customer request",
            effectiveDate: new DateOnly(2026, 3, 31),
            actorUserId: 1,
            updatedAt: DateTimeOffset.UtcNow);

        contract.Status.Should().Be(ContractStatus.Terminated);
        contract.IsActive.Should().BeFalse();
        contract.TerminationReason.Should().Be("customer request");
        contract.EndDate.Should().Be(new DateOnly(2026, 3, 31));
    }

    [Fact]
    public void Terminate_RejectsBeforeStartDate()
    {
        var contract = MinimalContract(startDate: new DateOnly(2026, 6, 1));

        var act = () => contract.Terminate(
            reason: "invalid",
            effectiveDate: new DateOnly(2026, 5, 1),
            actorUserId: 1,
            updatedAt: DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Terminate_AlreadyTerminated_Throws()
    {
        var contract = MinimalContract(startDate: new DateOnly(2026, 1, 1));
        contract.Terminate(
            reason: "first",
            effectiveDate: new DateOnly(2026, 3, 1),
            actorUserId: 1,
            updatedAt: DateTimeOffset.UtcNow);

        var act = () => contract.Terminate(
            reason: "second",
            effectiveDate: new DateOnly(2026, 4, 1),
            actorUserId: 1,
            updatedAt: DateTimeOffset.UtcNow);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Expire_TransitionsActiveToExpired()
    {
        var contract = MinimalContract(startDate: new DateOnly(2026, 1, 1));

        contract.Expire(actorUserId: 1, updatedAt: DateTimeOffset.UtcNow);

        contract.Status.Should().Be(ContractStatus.Expired);
        contract.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData(SalesType.Insurance, ContractFlow.Insurance)]
    [InlineData(SalesType.DirectChannel, ContractFlow.Insurance)]
    [InlineData(SalesType.Medical, ContractFlow.Insurance)]
    [InlineData(SalesType.Automotive, ContractFlow.Automotive)]
    [InlineData(SalesType.Fleet, ContractFlow.Automotive)]
    public void Flow_IsDerivedFromSalesType(SalesType salesType, ContractFlow expected)
    {
        var mapped = ContractFlowMapper.FromSalesType(salesType);

        mapped.Should().Be(expected);
    }

    private static Contract MinimalContract(
        int customerShortId = 1,
        decimal? unitPriceTry = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null) =>
        Contract.Create(
            companyId: 1, customerId: 1, customerShortId: customerShortId, productId: 1,
            businessLine: BusinessLine.RoadSideAssistance,
            salesType: SalesType.Insurance,
            productType: BudgetTracker.Core.Enums.Contracts.ProductType.Kasko,
            vehicleType: VehicleType.Binek,
            contractForm: ContractForm.Risky,
            contractType: BudgetTracker.Core.Enums.Contracts.ContractType.PerPolicy,
            paymentFrequency: PaymentFrequency.Daily,
            adjustmentClause: AdjustmentClause.WithoutClause,
            contractKind: ContractKind.CleanCut,
            serviceArea: ServiceArea.Domestic,
            createdAt: DateTimeOffset.UtcNow,
            unitPriceTry: unitPriceTry,
            startDate: startDate,
            endDate: endDate);
}
