using BudgetTracker.Application.BudgetEntries;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Customers;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Infrastructure.Authentication;
using BudgetTracker.Infrastructure.Common;
using BudgetTracker.Infrastructure.FxRates;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Persistence;
using BudgetTracker.Infrastructure.Persistence.Interceptors;
using BudgetTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddSingleton<TenantContext>();
        services.AddSingleton<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());
        services.AddSingleton<TenantConnectionInterceptor>();
        services.AddSingleton<IClock, SystemClock>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
            });
            options.UseSnakeCaseNamingConvention();
            options.AddInterceptors(sp.GetRequiredService<TenantConnectionInterceptor>());
            options.UseOpenIddict();
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IFxConversionService, FxConversionService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IBudgetEntryService, BudgetEntryService>();

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

        services.AddBudgetTrackerAuthentication();

        return services;
    }
}
