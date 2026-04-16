using BudgetTracker.Application.Calculations;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using FluentAssertions;
using MockQueryable.NSubstitute;
using NSubstitute;

namespace BudgetTracker.UnitTests.Application.Calculations;

public sealed class KpiCalculationEngineTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Calculate_WithGoldenScenarioData_ReturnsExpectedRatios()
    {
        // Arrange: construct data yielding known ratios
        // Total Revenue = 100_000, Total Claims = 58_980 → LR = 0.5898
        var budgetEntries = new List<BudgetEntry>
        {
            CreateBudgetEntry(1, 1, EntryType.Revenue, 100_000m, 1),
            CreateBudgetEntry(1, 1, EntryType.Claim, 58_980m, 1),
        };

        // Expenses: General=20_000, Technical=8_910 → Total Gider=28_910 → Gider Rasyosu=0.2891
        var expenseCategories = new List<ExpenseCategory>
        {
            CreateCategory(1, ExpenseClassification.General),
            CreateCategory(2, ExpenseClassification.Technical),
            CreateCategory(3, ExpenseClassification.Financial),
        };

        var expenseEntries = new List<ExpenseEntry>
        {
            CreateExpenseEntry(1, 20_000m, 1),
            CreateExpenseEntry(2, 8_910m, 1),
            CreateExpenseEntry(3, 510m, 1),
        };

        // Special items
        var specialItems = new List<SpecialItem>
        {
            CreateSpecialItem(SpecialItemType.FinansalGelir, 3_400m),
            CreateSpecialItem(SpecialItemType.TKatilim, 500m),
            CreateSpecialItem(SpecialItemType.Amortisman, 1_550m),
            CreateSpecialItem(SpecialItemType.MuallakHasar, 2_373m),
        };

        var versions = new List<BudgetVersion>
        {
            CreateVersion(1, 1)
        };

        var customers = new List<Customer>();

        var db = SetupDb(budgetEntries, expenseEntries, expenseCategories, specialItems, versions, customers);
        var sut = new KpiCalculationEngine(db);

        // Act
        var result = await sut.CalculateAsync(1, null, null, CancellationToken.None);

        // Assert — verify all 16+ KPIs
        result.TotalRevenue.Should().Be(100_000m);
        result.TotalClaims.Should().Be(58_980m);
        result.TechnicalMargin.Should().Be(41_020m); // 100k - 58.98k

        result.LossRatio.Should().Be(0.5898m);
        result.GeneralExpenses.Should().Be(20_000m);
        result.TechnicalExpenses.Should().Be(8_910m);
        result.TechnicalProfit.Should().Be(12_110m); // 41020 - 8910 - 20000
        result.FinancialIncome.Should().Be(3_400m);
        result.FinancialExpenses.Should().Be(510m);
        result.TKatilim.Should().Be(500m);
        result.Depreciation.Should().Be(1_550m);

        // Net Kar = TechnicalProfit + FinancialIncome - FinancialExpenses + TKatilim
        // = 12110 + 3400 - 510 + 500 = 15500
        result.NetProfit.Should().Be(15_500m);

        // EBITDA = NetProfit + Depreciation + FinancialExpenses = 15500 + 1550 + 510 = 17560
        result.Ebitda.Should().Be(17_560m);

        // Gider Rasyosu = (20000+8910+510) / 100000 = 0.2942
        result.ExpenseRatio.Should().Be(0.2942m);

        // Combined Ratio = LR + ER = 0.5898 + 0.2942 = 0.8840
        result.CombinedRatio.Should().Be(0.8840m);

        result.EbitdaMargin.Should().Be(0.1756m);
        result.TechnicalProfitRatio.Should().Be(0.1211m);
        result.ProfitRatio.Should().Be(0.1550m);

        // Muallak Ratio = 2373 / 58980 = 0.0402..
        result.MuallakRatio.Should().Be(0.0402m);
    }

    [Fact]
    public async Task Calculate_WithZeroRevenue_ReturnsZeroRatios()
    {
        var db = SetupDb([], [], [], [], [CreateVersion(1, 1)], []);
        var sut = new KpiCalculationEngine(db);

        var result = await sut.CalculateAsync(1, null, null, CancellationToken.None);

        result.LossRatio.Should().Be(0m);
        result.ExpenseRatio.Should().Be(0m);
        result.CombinedRatio.Should().Be(0m);
        result.EbitdaMargin.Should().Be(0m);
    }

    [Fact]
    public async Task Calculate_WithMonthRange_FiltersCorrectly()
    {
        var entries = new List<BudgetEntry>
        {
            CreateBudgetEntry(1, 1, EntryType.Revenue, 10_000m, 1),
            CreateBudgetEntry(1, 1, EntryType.Revenue, 20_000m, 3),
            CreateBudgetEntry(1, 1, EntryType.Revenue, 30_000m, 6),
        };

        var db = SetupDb(entries, [], [], [], [CreateVersion(1, 1)], []);
        var sut = new KpiCalculationEngine(db);

        var result = await sut.CalculateAsync(1, null, new MonthRange(1, 3), CancellationToken.None);

        result.TotalRevenue.Should().Be(30_000m); // Jan + Mar only
    }

    [Fact]
    public async Task CalculateConcentration_ReturnsCorrectHHI()
    {
        var entries = new List<BudgetEntry>
        {
            CreateBudgetEntry(1, 1, EntryType.Revenue, 50_000m, 1),
            CreateBudgetEntry(1, 2, EntryType.Revenue, 30_000m, 1),
            CreateBudgetEntry(1, 3, EntryType.Revenue, 20_000m, 1),
        };

        var db = SetupDb(entries, [], [], [], [CreateVersion(1, 1)], []);
        var sut = new KpiCalculationEngine(db);

        var result = await sut.CalculateConcentrationAsync(1, 2, CancellationToken.None);

        result.TopNShare.Should().Be(0.8000m); // (50k + 30k) / 100k
        result.TopCustomers.Should().HaveCount(2);
        result.TopCustomers[0].Revenue.Should().Be(50_000m);

        // HHI = (0.5)^2 + (0.3)^2 + (0.2)^2 = 0.25 + 0.09 + 0.04 = 0.38
        result.Hhi.Should().Be(0.3800m);
    }

    #region Helpers

    private static IApplicationDbContext SetupDb(
        List<BudgetEntry> entries,
        List<ExpenseEntry> expenses,
        List<ExpenseCategory> categories,
        List<SpecialItem> specials,
        List<BudgetVersion> versions,
        List<Customer> customers)
    {
        var mockEntries = entries.AsQueryable().BuildMockDbSet();
        var mockExpenses = expenses.AsQueryable().BuildMockDbSet();
        var mockCategories = categories.AsQueryable().BuildMockDbSet();
        var mockSpecials = specials.AsQueryable().BuildMockDbSet();
        var mockVersions = versions.AsQueryable().BuildMockDbSet();
        var mockCustomers = customers.AsQueryable().BuildMockDbSet();

        var db = Substitute.For<IApplicationDbContext>();
        db.BudgetEntries.Returns(mockEntries);
        db.ExpenseEntries.Returns(mockExpenses);
        db.ExpenseCategories.Returns(mockCategories);
        db.SpecialItems.Returns(mockSpecials);
        db.BudgetVersions.Returns(mockVersions);
        db.Customers.Returns(mockCustomers);
        return db;
    }

    private static BudgetEntry CreateBudgetEntry(int versionId, int customerId, EntryType type, decimal amount, int month)
        => BudgetEntry.Create(1, versionId, customerId, month, type, amount, "TRY", amount, amount, 1, Now);

    private static ExpenseEntry CreateExpenseEntry(int categoryId, decimal amount, int month)
        => ExpenseEntry.Create(1, 1, 1, categoryId, month, ExpenseEntryType.Budget, amount, "TRY", amount, amount, 1, Now);

    private static ExpenseCategory CreateCategory(int id, ExpenseClassification classification)
    {
        // Use reflection to set Id since it has a protected setter
        var cat = typeof(ExpenseCategory).GetConstructor(
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance,
            null, Type.EmptyTypes, null)!.Invoke(null) as ExpenseCategory;
        typeof(ExpenseCategory).GetProperty("Id")!.SetValue(cat, id);
        typeof(ExpenseCategory).GetProperty("Classification")!.SetValue(cat, classification);
        typeof(ExpenseCategory).GetProperty("CompanyId")!.SetValue(cat, 1);
        return cat!;
    }

    private static SpecialItem CreateSpecialItem(SpecialItemType type, decimal amount)
        => SpecialItem.Create(1, 1, 1, type, amount, "TRY", 1, Now);

    private static BudgetVersion CreateVersion(int id, int budgetYearId)
    {
        var v = BudgetVersion.CreateDraft(1, budgetYearId, "Test", 1);
        typeof(BudgetVersion).GetProperty("Id")!.SetValue(v, id);
        return v;
    }

    #endregion
}
