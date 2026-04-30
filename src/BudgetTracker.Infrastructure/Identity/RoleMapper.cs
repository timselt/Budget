using BudgetTracker.Core.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// Faz 1.5 — TAG Portal SSO rol senkronizasyonu.
///
/// Spec section 6.3: TAG Portal `tag_portal_roles` claim listesinden FinOps.*
/// rollerini filtrele, en yüksek precedence'i seç, lokal Identity rolüne map'le.
/// FinOps.* yoksa default `Viewer` (Q1-B fallback).
///
/// Precedence (yüksekten düşüğe):
///   FinOps.Admin > FinOps.Cfo > FinOps.FinanceManager > FinOps.DepartmentHead > FinOps.Viewer
/// </summary>
public sealed class RoleMapper
{
    private readonly UserManager<User> _userManager;
    private readonly ILogger<RoleMapper> _logger;

    /// <summary>Precedence sırası — yüksek-öncelik en başta.</summary>
    private static readonly IReadOnlyList<string> PrecedenceOrder = new[]
    {
        "FinOps.Admin",
        "FinOps.Cfo",
        "FinOps.FinanceManager",
        "FinOps.DepartmentHead",
        "FinOps.Viewer",
    };

    /// <summary>TAG Portal claim → lokal Identity rol adı.</summary>
    private static readonly IReadOnlyDictionary<string, string> ClaimToLocalRole =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["FinOps.Admin"] = RoleNames.Admin,
            ["FinOps.Cfo"] = RoleNames.Cfo,
            ["FinOps.FinanceManager"] = RoleNames.FinanceManager,
            ["FinOps.DepartmentHead"] = RoleNames.DepartmentHead,
            ["FinOps.Viewer"] = RoleNames.Viewer,
        };

    /// <summary>Tüm yönetilen FinOps lokal rolleri (sync fark hesabında kullanılır).</summary>
    private static readonly IReadOnlySet<string> ManagedLocalRoles =
        ClaimToLocalRole.Values.ToHashSet(StringComparer.Ordinal);

    public RoleMapper(UserManager<User> userManager, ILogger<RoleMapper> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    /// <summary>
    /// Tag Portal claim listesinden seçilen tek bir lokal rolü kullanıcıya atar.
    /// Mevcut yönetilen rollerden farklı olanları kaldırır. Q1-B fallback: hiç
    /// FinOps.* yoksa default `Viewer`.
    /// </summary>
    public async Task SyncRolesAsync(User user, IEnumerable<string> tagPortalRoles)
    {
        ArgumentNullException.ThrowIfNull(user);
        ArgumentNullException.ThrowIfNull(tagPortalRoles);

        var claimRoles = tagPortalRoles
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .ToHashSet(StringComparer.Ordinal);

        // En yüksek precedence — yoksa default Viewer (Q1-B)
        var selectedClaim = PrecedenceOrder.FirstOrDefault(claimRoles.Contains);
        var targetRole = selectedClaim is not null && ClaimToLocalRole.TryGetValue(selectedClaim, out var local)
            ? local
            : RoleNames.Viewer;

        var existingRoles = await _userManager.GetRolesAsync(user);
        var existingManaged = existingRoles
            .Where(ManagedLocalRoles.Contains)
            .ToHashSet(StringComparer.Ordinal);

        var toRemove = existingManaged.Where(r => r != targetRole).ToList();
        if (toRemove.Count > 0)
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, toRemove);
            if (!removeResult.Succeeded)
            {
                _logger.LogWarning(
                    "RoleMapper: rol kaldırma başarısız (user={UserId}, roles=[{Roles}]): {Errors}",
                    user.Id, string.Join(",", toRemove),
                    string.Join("; ", removeResult.Errors.Select(e => e.Description)));
            }
        }

        if (!existingManaged.Contains(targetRole))
        {
            var addResult = await _userManager.AddToRoleAsync(user, targetRole);
            if (!addResult.Succeeded)
            {
                _logger.LogWarning(
                    "RoleMapper: rol ekleme başarısız (user={UserId}, role={Role}): {Errors}",
                    user.Id, targetRole,
                    string.Join("; ", addResult.Errors.Select(e => e.Description)));
                return;
            }
        }

        _logger.LogDebug(
            "RoleMapper: user={UserId} → {Role} (claim source={Source})",
            user.Id, targetRole, selectedClaim ?? "<default Viewer>");
    }
}
