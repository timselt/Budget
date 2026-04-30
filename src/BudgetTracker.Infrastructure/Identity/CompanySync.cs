using BudgetTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BudgetTracker.Infrastructure.Identity;

/// <summary>
/// Faz 1.5 — Multi-tenant şirket atama senkronizasyonu (spec section 8).
///
/// TAG Portal `tag_portal_companies` claim'i (slug listesi) ile FinOps Tur
/// `user_companies` tablosu arasında diff:
///   - Eklenecek: claim'de var, lokal'de yok → INSERT
///   - Çıkarılacak: lokal'de var, claim'de yok → DELETE
///
/// Eşleşmeyen slug (FinOps Tur'da o Code'lu Company yok) → log warning + atla.
/// İlk atama IsDefault=true (kullanıcının başlangıç şirketi); sonraki atamalar IsDefault=false.
/// </summary>
public sealed class CompanySync
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<CompanySync> _logger;

    public CompanySync(ApplicationDbContext dbContext, ILogger<CompanySync> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task SyncCompaniesAsync(
        User user,
        IEnumerable<string> tagPortalCompanySlugs,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(user);
        ArgumentNullException.ThrowIfNull(tagPortalCompanySlugs);

        var slugSet = tagPortalCompanySlugs
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (slugSet.Count == 0)
        {
            // Mevcut tüm atamaları kaldır
            var allExisting = await _dbContext.UserCompanies
                .Where(uc => uc.UserId == user.Id)
                .ToListAsync(cancellationToken);

            if (allExisting.Count > 0)
            {
                _dbContext.UserCompanies.RemoveRange(allExisting);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            return;
        }

        // Slug → CompanyId; case-insensitive eşleşme için ToLower karşılaştırma
        // (Postgres `citext` yoksa, EF projection ile çözüm).
        var matchedCompanies = await _dbContext.Companies
            .Where(c => slugSet.Contains(c.Code))
            .Select(c => new { c.Id, c.Code })
            .ToListAsync(cancellationToken);

        // Eşleşmeyen slug'ları logla
        var matchedCodes = matchedCompanies
            .Select(c => c.Code)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var unmatched = slugSet.Where(s => !matchedCodes.Contains(s)).ToList();
        if (unmatched.Count > 0)
        {
            _logger.LogWarning(
                "CompanySync: TAG Portal'dan {Count} eşleşmeyen şirket slug — atlandı: {Slugs}",
                unmatched.Count, string.Join(", ", unmatched));
        }

        var matchedIds = matchedCompanies.Select(c => c.Id).ToHashSet();

        var existing = await _dbContext.UserCompanies
            .Where(uc => uc.UserId == user.Id)
            .ToListAsync(cancellationToken);
        var existingIds = existing.Select(uc => uc.CompanyId).ToHashSet();

        var toAdd = matchedIds.Except(existingIds).ToList();
        var toRemove = existing.Where(uc => !matchedIds.Contains(uc.CompanyId)).ToList();

        var hasAnyExistingDefault = existing.Any(uc => uc.IsDefault);

        foreach (var companyId in toAdd)
        {
            _dbContext.UserCompanies.Add(new UserCompany
            {
                UserId = user.Id,
                CompanyId = companyId,
                // İlk atama (mevcut hiç yoksa veya default'u silinmişse) IsDefault=true
                IsDefault = !hasAnyExistingDefault && toAdd[0] == companyId,
                AssignedAt = DateTimeOffset.UtcNow,
            });
            if (!hasAnyExistingDefault) hasAnyExistingDefault = true;
        }

        if (toRemove.Count > 0)
        {
            _dbContext.UserCompanies.RemoveRange(toRemove);
        }

        if (toAdd.Count > 0 || toRemove.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "CompanySync: user={UserId} → +{AddCount} -{RemoveCount} (matched {Matched}/{Total} slugs)",
                user.Id, toAdd.Count, toRemove.Count, matchedCompanies.Count, slugSet.Count);
        }
    }
}
