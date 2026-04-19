using BudgetTracker.Application.Audit;
using BudgetTracker.Application.BackgroundJobs;
using BudgetTracker.Application.BudgetEntries;
using BudgetTracker.Application.BudgetOperations;
using BudgetTracker.Application.BudgetTree;
using BudgetTracker.Application.Collections;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Contracts;
using BudgetTracker.Application.Customers;
using BudgetTracker.Application.ExpenseCategories;
using BudgetTracker.Application.Expenses;
using BudgetTracker.Application.PriceBooks;
using BudgetTracker.Application.Reconciliation.Batches;
using BudgetTracker.Application.Reconciliation.Cases;
using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Application.Reconciliation.Lines;
using BudgetTracker.Infrastructure.Reconciliation.Batches;
using BudgetTracker.Infrastructure.Reconciliation.Cases;
using BudgetTracker.Infrastructure.Reconciliation.Import;
using BudgetTracker.Infrastructure.Reconciliation.Lines;
using BudgetTracker.Application.Pricing;
using BudgetTracker.Application.Products;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Application.Imports;
using BudgetTracker.Application.Reports;
using BudgetTracker.Application.Scenarios;
using BudgetTracker.Application.Segments;
using BudgetTracker.Application.SpecialItems;
using BudgetTracker.Application.Variance;
using BudgetTracker.Core.Common;
using BudgetTracker.Infrastructure.Audit;
using BudgetTracker.Infrastructure.Authentication;
using BudgetTracker.Infrastructure.BackgroundJobs;
using BudgetTracker.Infrastructure.Common;
using BudgetTracker.Infrastructure.FxRates;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Imports;
using BudgetTracker.Infrastructure.Observability;
using BudgetTracker.Infrastructure.Persistence;
using BudgetTracker.Infrastructure.Persistence.Interceptors;
using BudgetTracker.Infrastructure.Reports;
using BudgetTracker.Infrastructure.Services;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        X509Certificate2? openIddictEncryptionCert = null,
        X509Certificate2? openIddictSigningCert = null,
        bool disableTransportSecurity = false)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddSingleton<TenantContext>();
        services.AddSingleton<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());
        services.AddSingleton<TenantConnectionInterceptor>();
        services.AddSingleton<IClock, SystemClock>();

        // ADR-0007 §2.3 + §2.4 — structured log enrichers. HttpContextAccessor is
        // registered by ASP.NET but we add it explicitly so enrichers remain safe in
        // non-web hosts (tests, CLI seeders) where the accessor is absent.
        services.AddHttpContextAccessor();
        services.AddSingleton<Serilog.Core.ILogEventEnricher, BudgetTrackerLogEnricher>();
        services.AddSingleton<Serilog.Core.ILogEventEnricher, PiiMaskingEnricher>();

        // optionsLifetime = Singleton because the matching AddDbContextFactory
        // below is Singleton too. Default Scoped options would fail strict
        // ValidateScopes checks (enabled in Staging/Production) because a
        // Singleton factory cannot consume a Scoped DbContextOptions.
        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
            });
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetRequiredService<TenantConnectionInterceptor>());
            options.UseOpenIddict();
        }, contextLifetime: ServiceLifetime.Scoped, optionsLifetime: ServiceLifetime.Singleton);

        // ADR-0007 §2.6 — isolated context factory for audit writes. Shares the
        // Npgsql + snake-case + interceptor surface with the scoped context, but
        // deliberately omits UseOpenIddict(): the audit factory context only ever
        // writes to audit_logs and never touches OpenIddict tables, and running
        // OpenIddict's model configuration twice against the same entity types
        // risks duplicate-entity-type conflicts between the two model caches.
        services.AddDbContextFactory<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
            });
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetRequiredService<TenantConnectionInterceptor>());
        }, lifetime: ServiceLifetime.Singleton);

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IFxConversionService, FxConversionService>();
        services.AddScoped<ITcmbFxService, TcmbFxService>();
        services.AddHttpClient("tcmb", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("Accept", "application/xml");
        });
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICustomerImportService, CustomerImportService>();
        services.AddScoped<ISegmentService, SegmentService>();
        services.AddScoped<IExpenseCategoryService, ExpenseCategoryService>();
        services.AddScoped<IProductCategoryService, ProductCategoryService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IContractService, ContractService>();
        services.AddScoped<IPriceBookService, PriceBookService>();

        // 00b — PriceBook lookup cache (IMemoryCache, L1, Redis yasağı nedeniyle).
        // Scoped: IApplicationDbContext bağımlı; invalidation tokens static alanda
        // paylaşıldığı için request'lar arası tutarlı.
        services.AddMemoryCache();
        services.AddScoped<IPricingLookupService, PricingLookupService>();

        // Mutabakat Sprint 1 — import parser stack + batch service.
        services.AddScoped<XlsxStreamReader>();
        services.AddScoped<CsvStreamReader>();
        services.AddScoped<IReconciliationImportParser, ReconciliationImportParser>();
        services.AddScoped<IReconciliationBatchService, ReconciliationBatchService>();

        // Mutabakat Sprint 2 — Case/Line auto-creation (Task 4) + pricing resolver (Task 5).
        services.AddScoped<ILinePricingResolver, LinePricingResolver>();
        services.AddScoped<IReconciliationCaseAutoCreator, ReconciliationCaseAutoCreator>();
        services.AddScoped<IBudgetEntryService, BudgetEntryService>();
        services.AddScoped<IBudgetTreeService, BudgetTreeService>();
        services.AddScoped<IBudgetOperationsService, BudgetOperationsService>();
        services.AddScoped<IExpenseEntryService, ExpenseEntryService>();
        services.AddScoped<ISpecialItemService, SpecialItemService>();
        services.AddScoped<IVarianceService, VarianceService>();
        services.AddScoped<IScenarioService, ScenarioService>();
        services.AddScoped<IAuditQueryService, AuditQueryService>();
        services.AddScoped<ICollectionImportService, CollectionImportService>();
        services.AddScoped<ICollectionCalculationService, CollectionCalculationService>();
        services.AddScoped<ICollectionQueryService, CollectionQueryService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<IExcelImportService, ExcelImportService>();
        services.AddScoped<IPdfReportService, PdfReportService>();

        // F3 / ADR-0008 §2.3 — import concurrency guard.
        services.AddScoped<IImportGuard, PgAdvisoryImportGuard>();

        // F1 — Operational closure: audit logger + recurring jobs.
        services.AddScoped<IAuditLogger, AuditLogger>();
        services.Configure<TcmbFxSyncOptions>(configuration.GetSection(TcmbFxSyncOptions.SectionName));
        services.AddScoped<IAuditPartitionMaintenanceJob, AuditPartitionMaintenanceJob>();
        services.AddScoped<ITcmbFxSyncJob, TcmbFxSyncJob>();

        services.AddIdentity<User, Role>(options =>
            {
                options.Password.RequiredLength = 12;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.User.RequireUniqueEmail = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.SignIn.RequireConfirmedEmail = false;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.AddBudgetTrackerAuthentication(
            openIddictEncryptionCert,
            openIddictSigningCert,
            disableTransportSecurity);

        return services;
    }
}
