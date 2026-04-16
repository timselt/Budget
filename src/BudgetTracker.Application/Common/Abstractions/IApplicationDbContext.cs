using BudgetTracker.Core.Entities;
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
}
