namespace BudgetTracker.Application.Calculations;

public sealed record KpiResult(
    decimal TotalRevenue,
    decimal TotalClaims,
    decimal TechnicalMargin,
    decimal LossRatio,
    decimal GeneralExpenses,
    decimal TechnicalExpenses,
    decimal TechnicalProfit,
    decimal FinancialIncome,
    decimal FinancialExpenses,
    decimal TKatilim,
    decimal Depreciation,
    decimal NetProfit,
    decimal Ebitda,
    decimal ExpenseRatio,
    decimal CombinedRatio,
    decimal EbitdaMargin,
    decimal TechnicalProfitRatio,
    decimal ProfitRatio,
    decimal MuallakRatio);
