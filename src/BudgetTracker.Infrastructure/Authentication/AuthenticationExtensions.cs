using System.Security.Cryptography.X509Certificates;
using BudgetTracker.Core.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Infrastructure.Authentication;

public static class AuthenticationExtensions
{
    /// <summary>
    /// Registers OpenIddict server + validation. When <paramref name="encryptionCertificate"/>
    /// and <paramref name="signingCertificate"/> are supplied (production) the certs are used;
    /// otherwise ephemeral development certificates are generated.
    /// </summary>
    public static IServiceCollection AddBudgetTrackerAuthentication(
        this IServiceCollection services,
        X509Certificate2? encryptionCertificate = null,
        X509Certificate2? signingCertificate = null,
        bool disableTransportSecurity = false)
    {
        services.AddOpenIddict()
            .AddCore(options =>
            {
                options.UseEntityFrameworkCore()
                    .UseDbContext<ApplicationDbContext>();
            })
            .AddServer(options =>
            {
                options.SetTokenEndpointUris("connect/token")
                    .SetAuthorizationEndpointUris("connect/authorize")
                    .SetIntrospectionEndpointUris("connect/introspect")
                    .SetUserInfoEndpointUris("connect/userinfo")
                    .SetEndSessionEndpointUris("connect/logout");

                options.AllowPasswordFlow()
                    .AllowRefreshTokenFlow()
                    .AllowAuthorizationCodeFlow()
                    .RequireProofKeyForCodeExchange();

                options.RegisterScopes(
                    OpenIddictConstants.Scopes.Email,
                    OpenIddictConstants.Scopes.Profile,
                    OpenIddictConstants.Scopes.Roles,
                    OpenIddictConstants.Scopes.OfflineAccess,
                    "api");

                // Certificates: production supplies X509 via Railway volume mount; development
                // falls back to ephemeral in-memory certs regenerated each start.
                if (encryptionCertificate is not null && signingCertificate is not null)
                {
                    options.AddEncryptionCertificate(encryptionCertificate)
                        .AddSigningCertificate(signingCertificate);
                }
                else
                {
                    options.AddDevelopmentEncryptionCertificate()
                        .AddDevelopmentSigningCertificate();
                }

                options.SetAccessTokenLifetime(TimeSpan.FromMinutes(30))
                    .SetRefreshTokenLifetime(TimeSpan.FromDays(14));

                var aspNetCore = options.UseAspNetCore()
                    .EnableTokenEndpointPassthrough()
                    .EnableAuthorizationEndpointPassthrough()
                    .EnableEndSessionEndpointPassthrough()
                    .EnableUserInfoEndpointPassthrough();

                // HTTPS is enforced in production; local dev runs over plain HTTP.
                if (disableTransportSecurity)
                {
                    aspNetCore.DisableTransportSecurityRequirement();
                }
            })
            .AddValidation(options =>
            {
                options.UseLocalServer();
                options.UseAspNetCore();
                options.AddAudiences("budget-tracker-api");
            });

        services.AddAuthentication(options =>
        {
            options.DefaultScheme = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme;
        })
        .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
            options.LoginPath = "/connect/authorize";
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("Admin", p => p.RequireRole(RoleNames.Admin));
            options.AddPolicy("CFO", p => p.RequireRole(RoleNames.Cfo, RoleNames.Admin));
            // Controllers "Cfo" (PascalCase) ismini de kullanıyor — alias.
            options.AddPolicy("Cfo", p => p.RequireRole(RoleNames.Cfo, RoleNames.Admin));
            options.AddPolicy("Finance", p => p.RequireRole(RoleNames.FinanceManager, RoleNames.Admin));
            // Controllers `RequireFinanceRole` ve `FinanceManager` isimlerini de kullanıyor — alias.
            options.AddPolicy("RequireFinanceRole", p => p.RequireRole(RoleNames.FinanceManager, RoleNames.Admin));
            options.AddPolicy("FinanceManager", p => p.RequireRole(RoleNames.FinanceManager, RoleNames.Admin));
            options.AddPolicy("DepartmentHead", p =>
                p.RequireRole(RoleNames.DepartmentHead, RoleNames.Admin));
            options.AddPolicy("Viewer", p => p.RequireRole(
                RoleNames.Admin,
                RoleNames.Cfo,
                RoleNames.FinanceManager,
                RoleNames.DepartmentHead,
                RoleNames.Viewer));
        });

        return services;
    }
}
