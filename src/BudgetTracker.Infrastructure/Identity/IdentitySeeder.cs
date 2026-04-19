using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenIddict.Abstractions;

namespace BudgetTracker.Infrastructure.Identity;

public static class IdentitySeeder
{
    // Dev-only fixed password. Production seeding must read from a secret store.
    public const string DevDefaultPassword = "Devpass!2026";

    private static readonly (string Role, string Email, string DisplayName)[] DevUsers =
    {
        (RoleNames.Admin,          "admin@tag.local",   "TAG Admin"),
        (RoleNames.Cfo,             "cfo@tag.local",     "TAG CFO"),
        (RoleNames.FinanceManager,  "finance@tag.local", "Finance Manager"),
        (RoleNames.ReconAgent,      "recon@tag.local",   "Recon Agent"),
        (RoleNames.DepartmentHead,  "dept@tag.local",    "Department Head"),
        (RoleNames.Viewer,          "viewer@tag.local",  "Read-only User"),
    };

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var applicationManager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();

        await SeedDevOAuthClientAsync(applicationManager, cancellationToken);

        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new Role(roleName));
                logger.LogInformation("Seeded role {Role}", roleName);
            }
        }

        var tagCompany = await dbContext.Companies
            .Where(c => c.Code == "TAG")
            .Select(c => new { c.Id })
            .FirstOrDefaultAsync(cancellationToken);

        if (tagCompany is null)
        {
            logger.LogWarning("TAG company not found — skipping dev user seed");
            return;
        }

        foreach (var (role, email, displayName) in DevUsers)
        {
            if (await userManager.FindByEmailAsync(email) is not null)
            {
                continue;
            }

            var user = new User
            {
                UserName = email,
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTimeOffset.UtcNow,
                IsActive = true,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, DevDefaultPassword);
            if (!createResult.Succeeded)
            {
                logger.LogError("Failed to seed user {Email}: {Errors}",
                    email,
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                continue;
            }

            await userManager.AddToRoleAsync(user, role);

            dbContext.UserCompanies.Add(new UserCompany
            {
                UserId = user.Id,
                CompanyId = tagCompany.Id,
                IsDefault = true,
                AssignedAt = DateTimeOffset.UtcNow,
            });
            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Seeded dev user {Email} with role {Role}", email, role);
        }
    }

    private static async Task SeedDevOAuthClientAsync(
        IOpenIddictApplicationManager applicationManager,
        CancellationToken cancellationToken)
    {
        if (await applicationManager.FindByClientIdAsync("budget-tracker-dev", cancellationToken) is not null)
        {
            return;
        }

        await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
        {
            ClientId = "budget-tracker-dev",
            ClientType = OpenIddictConstants.ClientTypes.Public,
            DisplayName = "BudgetTracker Dev Client",
            Permissions =
            {
                OpenIddictConstants.Permissions.Endpoints.Token,
                OpenIddictConstants.Permissions.Endpoints.Authorization,
                OpenIddictConstants.Permissions.GrantTypes.Password,
                OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                OpenIddictConstants.Permissions.ResponseTypes.Code,
                OpenIddictConstants.Permissions.Scopes.Email,
                OpenIddictConstants.Permissions.Scopes.Profile,
                OpenIddictConstants.Permissions.Scopes.Roles,
                OpenIddictConstants.Permissions.Prefixes.Scope + "api",
            },
        }, cancellationToken);
    }
}
