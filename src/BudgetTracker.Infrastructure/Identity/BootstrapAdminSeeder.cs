using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// One-shot seeder that creates the first Admin user on a fresh
/// staging/production database so the rest of the Register endpoint
/// (which itself requires <c>Admin</c> policy) is reachable.
///
/// Invoked via <c>dotnet BudgetTracker.Api.dll --seed-bootstrap-admin</c>.
/// Idempotent — if the email already exists the seeder logs and exits
/// without modifying the user.
///
/// Reads two required environment variables:
///   BOOTSTRAP_ADMIN_EMAIL
///   BOOTSTRAP_ADMIN_PASSWORD
/// </summary>
public static class BootstrapAdminSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        var loggerFactory = services.GetRequiredService<ILoggerFactory>();
        var logger = loggerFactory.CreateLogger(typeof(BootstrapAdminSeeder).FullName!);
        var configuration = services.GetRequiredService<IConfiguration>();
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<Role>>();
        var dbContext = services.GetRequiredService<ApplicationDbContext>();

        var email = configuration["BOOTSTRAP_ADMIN_EMAIL"]
            ?? Environment.GetEnvironmentVariable("BOOTSTRAP_ADMIN_EMAIL")
            ?? throw new InvalidOperationException(
                "BOOTSTRAP_ADMIN_EMAIL environment variable is required. " +
                "Example: BOOTSTRAP_ADMIN_EMAIL=admin@tag.com.tr");

        var password = configuration["BOOTSTRAP_ADMIN_PASSWORD"]
            ?? Environment.GetEnvironmentVariable("BOOTSTRAP_ADMIN_PASSWORD")
            ?? throw new InvalidOperationException(
                "BOOTSTRAP_ADMIN_PASSWORD environment variable is required. " +
                "Use a strong random password — this account has full Admin rights.");

        // 1) Ensure the Admin role exists (Identity migration seeds it on
        //    most paths, but we guard in case of a partially-migrated DB).
        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new Role(roleName));
                logger.LogInformation("Seeded role {Role}", roleName);
            }
        }

        // 2) Idempotency — if the email already has a user, exit quietly.
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            logger.LogInformation(
                "Bootstrap admin '{Email}' already exists (UserId={UserId}); skipping",
                email, existing.Id);
            return;
        }

        // 3) Attach to the first Company in the database. On a fresh
        //    InitialSchema seed this is the 'TAG' company; production
        //    can replace it before inviting additional tenants.
        var company = await dbContext.Companies
            .OrderBy(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "No Company row present — InitialSchema seed may not have run. " +
                "Apply EF migrations first.");

        var user = new User
        {
            UserName = email,
            Email = email,
            DisplayName = "Bootstrap Admin",
            CreatedAt = DateTimeOffset.UtcNow,
            IsActive = true,
            EmailConfirmed = true,
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException(
                $"Failed to create bootstrap admin: {errors}");
        }

        await userManager.AddToRoleAsync(user, RoleNames.Admin);

        dbContext.UserCompanies.Add(new UserCompany
        {
            UserId = user.Id,
            CompanyId = company.Id,
            IsDefault = true,
            AssignedAt = DateTimeOffset.UtcNow,
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Bootstrap admin '{Email}' created with Admin role and default company '{CompanyCode}'",
            email, company.Code);
    }
}
