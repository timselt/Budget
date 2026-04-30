using System.Security.Claims;
using BudgetTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// Faz 1.5 — TAG Portal SSO Just-In-Time provisioning.
///
/// OIDC OnTokenValidated event'inde çağrılır. Principal'daki `sub` claim'i ile
/// FinOps Tur User tablosunda kullanıcı bulunur veya oluşturulur. Email/name
/// senkronize edilir, LastLoginAt güncellenir.
///
/// Spec section 7.1 (ilk login) + 7.2 (sonraki login). Q3 hibrit:
/// `User.ExternalSubjectId` = TAG Portal `sub` (Guid string), `User.Id` int kalır.
/// </summary>
public sealed class JitProvisioner
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<JitProvisioner> _logger;

    public JitProvisioner(
        UserManager<User> userManager,
        ApplicationDbContext dbContext,
        ILogger<JitProvisioner> logger)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Returns the locally-provisioned user, creating it on first login.
    /// Throws if claim'ler eksik veya UserManager.CreateAsync fail ederse.
    /// </summary>
    public async Task<User> EnsureUserAsync(
        ClaimsPrincipal principal,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(principal);

        var subject = principal.FindFirstValue("sub")
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(subject))
        {
            throw new InvalidOperationException(
                "OIDC token must contain 'sub' claim for JIT provisioning.");
        }

        var email = principal.FindFirstValue("email")
            ?? principal.FindFirstValue(ClaimTypes.Email)
            ?? throw new InvalidOperationException(
                "OIDC token must contain 'email' claim for JIT provisioning.");

        var name = principal.FindFirstValue("name")
            ?? principal.FindFirstValue(ClaimTypes.GivenName)
            ?? email;

        var existing = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.ExternalSubjectId == subject, cancellationToken);

        if (existing is null)
        {
            return await CreateAsync(subject, email, name);
        }

        return await SyncAsync(existing, email, name, cancellationToken);
    }

    private async Task<User> CreateAsync(string subject, string email, string name)
    {
        var user = new User
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = name,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            LastLoginAt = DateTimeOffset.UtcNow,
            ExternalSubjectId = subject,
        };

        var result = await _userManager.CreateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException(
                $"JIT provisioning failed for sub={subject}, email={email}: {errors}");
        }

        _logger.LogInformation(
            "JIT provisioned new user — sub={Subject}, email={Email}, id={UserId}",
            subject, email, user.Id);

        return user;
    }

    private async Task<User> SyncAsync(User user, string email, string name, CancellationToken ct)
    {
        var changed = false;

        if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = email;
            user.UserName = email;
            changed = true;
        }

        if (!string.Equals(user.DisplayName, name, StringComparison.Ordinal))
        {
            user.DisplayName = name;
            changed = true;
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;

        if (changed)
        {
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException(
                    $"JIT user sync failed for sub={user.ExternalSubjectId}: {errors}");
            }
        }
        else
        {
            await _dbContext.SaveChangesAsync(ct);
        }

        return user;
    }
}
