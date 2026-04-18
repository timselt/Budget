using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Persistence;

public sealed class ApplicationDbContext : IdentityDbContext<User, Role, int>, IApplicationDbContext
{
    private readonly ITenantContext _tenantContext;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<FxRate> FxRates => Set<FxRate>();
    public DbSet<Segment> Segments => Set<Segment>();
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<BudgetYear> BudgetYears => Set<BudgetYear>();
    public DbSet<BudgetVersion> BudgetVersions => Set<BudgetVersion>();
    public DbSet<AuditLogEntry> AuditLogs => Set<AuditLogEntry>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<BudgetEntry> BudgetEntries => Set<BudgetEntry>();
    public DbSet<ActualEntry> ActualEntries => Set<ActualEntry>();
    public DbSet<ExpenseEntry> ExpenseEntries => Set<ExpenseEntry>();
    public DbSet<SpecialItem> SpecialItems => Set<SpecialItem>();
    public DbSet<BudgetApproval> BudgetApprovals => Set<BudgetApproval>();
    public DbSet<UserSegment> UserSegments => Set<UserSegment>();
    public DbSet<UserCompany> UserCompanies => Set<UserCompany>();
    public DbSet<Scenario> Scenarios => Set<Scenario>();
    public DbSet<ImportPeriod> ImportPeriods => Set<ImportPeriod>();
    public DbSet<CollectionInvoice> CollectionInvoices => Set<CollectionInvoice>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CustomerProduct> CustomerProducts => Set<CustomerProduct>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => base.SaveChangesAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.UseOpenIddict();
    }

    /// <summary>Exposed for query filters defined in entity configurations.</summary>
    internal int? CurrentCompanyId => _tenantContext.CurrentCompanyId;
    internal bool BypassTenantFilter => _tenantContext.BypassFilter;
}
