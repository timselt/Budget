using System.Security.Cryptography.X509Certificates;
using BudgetTracker.Core.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BudgetTracker.Infrastructure.Authentication;

public static class AuthenticationExtensions
{
    /// <summary>
    /// Faz 1.5 — FinOps Tur, TAG Portal OIDC server'ının client'ı oldu. OpenIddict
    /// server burada artık kurulmaz; password grant kapalıdır. Login akışı:
    /// Cookie auth + OIDC handler (Authorization Code + PKCE) → TAG Portal'a redirect.
    ///
    /// Cert parametreleri eski OpenIddict server için tutuluyordu; Faz 1.5'te artık
    /// kullanılmıyor (FinOps Tur token üretmez). Geriye dönük binary uyumluluk
    /// için signature korundu; cleanup Faz G'de yapılır (ProductionCertificateLoader
    /// + OpenIddictCertificateOptions + ProductionOidcClientSeeder dosyaları silinir).
    ///
    /// 16 authorization policy korundu — TAG Portal'dan gelen `tag_portal_roles`
    /// claim'i RoleMapper (Faz D, T15) ile lokal Identity rollerine senkronize
    /// edildikten sonra policy.RequireRole(...) çalışır.
    /// </summary>
    public static IServiceCollection AddBudgetTrackerAuthentication(
        this IServiceCollection services,
        X509Certificate2? encryptionCertificate = null,
        X509Certificate2? signingCertificate = null,
        bool disableTransportSecurity = false)
    {
        // Faz 1.5: OpenIddict server zinciri kaldırıldı. Cert parametreleri kullanılmıyor;
        // Program.cs cleanup'ı (cert yükleme bloğu) Faz G'de yapılır.
        _ = encryptionCertificate;
        _ = signingCertificate;

        services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        })
        .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = disableTransportSecurity
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
            options.LoginPath = "/api/auth/login";
            options.LogoutPath = "/api/auth/logout";
            options.AccessDeniedPath = "/api/auth/forbidden";
        })
        .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
        {
            // Configuration is read from a delayed accessor below; this lambda is invoked
            // by Configure<OpenIdConnectOptions>(...) registered after the chain.
        });

        services.AddOptions<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme)
            .Configure<IConfiguration>((options, configuration) =>
            {
                options.Authority = configuration["TagPortal:Authority"]
                    ?? throw new InvalidOperationException(
                        "TagPortal:Authority is required for OIDC client (set via appsettings or env).");
                options.ClientId = configuration["TagPortal:ClientId"] ?? "finopstur";
                options.ClientSecret = configuration["TagPortal:ClientSecret"]
                    ?? throw new InvalidOperationException(
                        "TagPortal:ClientSecret is required (confidential client).");

                options.ResponseType = "code";
                options.UsePkce = true;
                options.SaveTokens = true;
                options.GetClaimsFromUserInfoEndpoint = false; // tag_portal_* claim'ler id_token'da
                options.MapInboundClaims = false;              // raw claim type'larını koru

                options.Scope.Clear();
                options.Scope.Add("openid");
                options.Scope.Add("profile");
                options.Scope.Add("email");
                options.Scope.Add("api");
                options.Scope.Add("offline_access");

                options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.SignedOutRedirectUri = "/";
                options.CallbackPath = "/signin-oidc";
                options.SignedOutCallbackPath = "/signout-callback-oidc";

                // Dev'de http://localhost authority kullanılır; HTTPS metadata zorunluluğunu kaldır.
                if (disableTransportSecurity)
                {
                    options.RequireHttpsMetadata = false;
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    NameClaimType = "name",
                    // RoleMapper (Faz D T15) tag_portal_roles claim'ini lokal Identity rollerine
                    // senkronize ediyor; ASP.NET RoleClaimType lokal "role" claim'i okur.
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("Admin", p => p.RequireRole(RoleNames.Admin));
            options.AddPolicy("CFO", p => p.RequireRole(RoleNames.Cfo, RoleNames.Admin));
            options.AddPolicy("Cfo", p => p.RequireRole(RoleNames.Cfo, RoleNames.Admin));
            options.AddPolicy("Finance", p => p.RequireRole(RoleNames.FinanceManager, RoleNames.Admin));
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

            // Mutabakat / Reconciliation policy'leri (00c §4 — segregation of duties)
            options.AddPolicy("Reconciliation.Import", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.Manage", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.SendToCustomer", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("Reconciliation.ExportAccounting", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager));
            options.AddPolicy("Reconciliation.AckAccounting", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager));
            options.AddPolicy("Reconciliation.ConfigRisk", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo));
            options.AddPolicy("Reconciliation.ViewReports", p => p.RequireAuthenticatedUser());

            // PriceBook policy'leri (00b)
            options.AddPolicy("PriceBook.Edit", p => p.RequireRole(
                RoleNames.Admin, RoleNames.FinanceManager, RoleNames.ReconAgent));
            options.AddPolicy("PriceBook.Approve", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo));

            // Contract yaşam döngüsü
            options.AddPolicy("Contract.Manage", p => p.RequireRole(
                RoleNames.Admin, RoleNames.Cfo, RoleNames.FinanceManager));
        });

        return services;
    }
}
