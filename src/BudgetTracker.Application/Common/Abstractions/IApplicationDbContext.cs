using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Application.Common.Abstractions;

public interface IApplicationDbContext : IUnitOfWork
{
    DbSet<Company> Companies { get; }
    DbSet<Currency> Currencies { get; }
    DbSet<FxRate> FxRates { get; }
    DbSet<Segment> Segments { get; }
    DbSet<ExpenseCategory> ExpenseCategories { get; }
    DbSet<BudgetYear> BudgetYears { get; }
    DbSet<BudgetVersion> BudgetVersions { get; }
    DbSet<AuditLogEntry> AuditLogs { get; }
    DbSet<Customer> Customers { get; }
    DbSet<BudgetEntry> BudgetEntries { get; }
    DbSet<ActualEntry> ActualEntries { get; }
    DbSet<ExpenseEntry> ExpenseEntries { get; }
    DbSet<SpecialItem> SpecialItems { get; }
    DbSet<BudgetApproval> BudgetApprovals { get; }
    DbSet<UserSegment> UserSegments { get; }
    DbSet<Scenario> Scenarios { get; }
    DbSet<ImportPeriod> ImportPeriods { get; }
    DbSet<CollectionInvoice> CollectionInvoices { get; }
    DbSet<ProductCategory> ProductCategories { get; }
    DbSet<Product> Products { get; }
    DbSet<Contract> Contracts { get; }
    DbSet<PriceBook> PriceBooks { get; }
    DbSet<PriceBookItem> PriceBookItems { get; }

    // Mutabakat Sprint 1
    DbSet<ReconciliationBatch> ReconciliationBatches { get; }
    DbSet<ReconciliationSourceRow> ReconciliationSourceRows { get; }
    DbSet<ReconciliationCase> ReconciliationCases { get; }
    DbSet<ReconciliationLine> ReconciliationLines { get; }
    DbSet<ReconciliationDecision> ReconciliationDecisions { get; }
    DbSet<AccountingInstruction> AccountingInstructions { get; }
    DbSet<RiskRuleSet> RiskRuleSets { get; }
}
