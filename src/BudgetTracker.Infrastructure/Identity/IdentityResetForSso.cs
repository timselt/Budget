using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// Faz 1.5 — Bir defaya mahsus migration komutu: FinOps Tur Identity tablolarını
/// boşaltır ki yeni TAG Portal SSO akışı temiz bir state'le başlasın.
///
/// Spec section 7.3 (Q3-A kararı). Production'da kullanıcı yokken çalıştırılır;
/// dev/staging seed'i yenileme ihtiyacında da kullanılabilir.
///
/// CLI:
///   dotnet BudgetTracker.Api.dll --reset-identity-for-sso
///
/// Production environment'ında runs only with explicit `--force-reset` flag.
/// Roller (AspNetRoles) korunur; sadece kullanıcılar + assignment'lar temizlenir.
/// </summary>
public static class IdentityResetForSso
{
    public static async Task ResetAsync(
        IServiceProvider serviceProvider,
        bool forceInProduction = false,
        CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILoggerFactory>()
            .CreateLogger("BudgetTracker.Infrastructure.Identity.IdentityResetForSso");
        var environment = sp.GetRequiredService<IHostEnvironment>();
        var dbContext = sp.GetRequiredService<ApplicationDbContext>();

        if (!environment.IsDevelopment() && !forceInProduction)
        {
            throw new InvalidOperationException(
                "IdentityResetForSso refuses to run outside Development. " +
                "Pass --force-reset explicitly if you really mean to wipe identity in this environment.");
        }

        logger.LogWarning(
            "Identity reset starting (env={Env}, force={Force}). " +
            "Tables to be cleared: AspNetUsers, AspNetUserRoles, AspNetUserClaims, " +
            "AspNetUserLogins, AspNetUserTokens, user_companies, OpenIddict tokens/authorizations.",
            environment.EnvironmentName, forceInProduction);

        // Sıra önemli: foreign-key bağımlılıklarına göre yaprak tabloyu önce temizle.
        // PostgreSQL CASCADE TRUNCATE alternatifi: tek SQL ile, ama EF migration'la
        // tutarlı kalmak için tablo-bazlı ExecuteDelete tercih edildi.
        await dbContext.UserCompanies.ExecuteDeleteAsync(cancellationToken);

        // OpenIddict server kaldırıldı ama tablolar hâlâ schema'da; reset onları da temizler.
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                "OpenIddictTokens",
                "OpenIddictAuthorizations"
            CASCADE;
            """,
            cancellationToken);

        // Identity yaprak tabloları (UserClaim, UserLogin, UserToken, UserRole)
        // Identity tablo isimleri lower-snake olabilir (EFCore.NamingConventions);
        // ExecuteSqlRaw raw quoted isim kullanır.
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                "asp_net_user_roles",
                "asp_net_user_claims",
                "asp_net_user_logins",
                "asp_net_user_tokens",
                "asp_net_users"
            CASCADE;
            """,
            cancellationToken);

        logger.LogWarning(
            "Identity reset complete. Roles preserved (AspNetRoles). " +
            "Next OIDC login will JIT-provision users from TAG Portal claims.");
    }
}
