using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenIddict.Abstractions;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// One-shot seeder that provisions the production SPA OIDC client (`budget-tracker-spa`)
/// via <see cref="IOpenIddictApplicationManager"/>. Invoked from the release runbook
/// (see <c>infra/release/README.md</c>) — not from the normal application startup.
/// </summary>
public static class ProductionOidcClientSeeder
{
    public const string ProdClientId = "budget-tracker-spa";

    public static async Task SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        var loggerFactory = services.GetRequiredService<ILoggerFactory>();
        var logger = loggerFactory.CreateLogger(typeof(ProductionOidcClientSeeder).FullName!);
        var configuration = services.GetRequiredService<IConfiguration>();
        var applicationManager = services.GetRequiredService<IOpenIddictApplicationManager>();

        var redirectUri = configuration["OpenIddict:ProdClient:RedirectUri"]
            ?? throw new InvalidOperationException(
                "OpenIddict:ProdClient:RedirectUri is required to seed the production client. " +
                "Set it via Railway env-var.");
        var postLogoutRedirectUri = configuration["OpenIddict:ProdClient:PostLogoutRedirectUri"]
            ?? throw new InvalidOperationException(
                "OpenIddict:ProdClient:PostLogoutRedirectUri is required to seed the production client.");

        // Both URIs must be absolute HTTPS to prevent open-redirect/XSS via misconfiguration.
        RequireAbsoluteHttps(redirectUri, "RedirectUri");
        RequireAbsoluteHttps(postLogoutRedirectUri, "PostLogoutRedirectUri");

        var existing = await applicationManager.FindByClientIdAsync(ProdClientId, cancellationToken);
        if (existing is not null)
        {
            // Emit a loud warning if the stored redirect URI diverges from the configured
            // one — a silent skip would hide a production break where PKCE returns 400.
            var existingRedirectUris = await applicationManager.GetRedirectUrisAsync(existing, cancellationToken);
            if (!existingRedirectUris.Contains(redirectUri))
            {
                logger.LogWarning(
                    "Production OIDC client '{ClientId}' exists but its redirect URIs {Existing} " +
                    "do not contain the configured {Configured}. Update the application manually " +
                    "(ApplicationManager.UpdateAsync) or delete and re-seed.",
                    ProdClientId, string.Join(",", existingRedirectUris), redirectUri);
            }
            else
            {
                logger.LogInformation(
                    "Production OIDC client '{ClientId}' already exists; skipping seed", ProdClientId);
            }
            return;
        }

        var descriptor = new OpenIddictApplicationDescriptor
        {
            ClientId = ProdClientId,
            // Public client (SPA) — no client secret; PKCE enforced by the server.
            ClientType = OpenIddictConstants.ClientTypes.Public,
            DisplayName = "FinOps Tur SPA",
            RedirectUris = { new Uri(redirectUri) },
            PostLogoutRedirectUris = { new Uri(postLogoutRedirectUri) },
            Permissions =
            {
                OpenIddictConstants.Permissions.Endpoints.Authorization,
                OpenIddictConstants.Permissions.Endpoints.Token,
                OpenIddictConstants.Permissions.Endpoints.EndSession,
                OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                OpenIddictConstants.Permissions.ResponseTypes.Code,
                OpenIddictConstants.Permissions.Scopes.Email,
                OpenIddictConstants.Permissions.Scopes.Profile,
                OpenIddictConstants.Permissions.Scopes.Roles,
                OpenIddictConstants.Permissions.Prefixes.Scope + "api",
            },
            Requirements =
            {
                OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange,
            },
        };

        await applicationManager.CreateAsync(descriptor, cancellationToken);
        logger.LogInformation(
            "Production OIDC client '{ClientId}' seeded with redirect URI {Redirect}",
            ProdClientId, redirectUri);
    }

    private static void RequireAbsoluteHttps(string value, string settingName)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"OpenIddict:ProdClient:{settingName} must be an absolute HTTPS URI. Got: '{value}'.");
        }
    }
}
