using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class AuditQueryService : IAuditQueryService
{
    private readonly IApplicationDbContext _db;
    private readonly UserManager<User> _userManager;

    public AuditQueryService(IApplicationDbContext db, UserManager<User> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public async Task<PagedAuditResult> GetAuditLogsAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken)
    {
        var baseQuery = _db.AuditLogs.AsNoTracking().AsQueryable();

        if (query.UserId.HasValue)
        {
            baseQuery = baseQuery.Where(a => a.UserId == query.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            baseQuery = baseQuery.Where(a => a.EntityName == query.EntityType);
        }

        if (query.DateFrom.HasValue)
        {
            baseQuery = baseQuery.Where(a => a.CreatedAt >= query.DateFrom.Value);
        }

        if (query.DateTo.HasValue)
        {
            baseQuery = baseQuery.Where(a => a.CreatedAt <= query.DateTo.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var page = Math.Max(1, query.Page);
        var limit = Math.Clamp(query.Limit, 1, 200);

        var entries = await baseQuery
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var userIds = entries
            .Where(e => e.UserId.HasValue)
            .Select(e => e.UserId!.Value)
            .Distinct()
            .ToList();

        var userDisplayNames = new Dictionary<int, string>();
        foreach (var userId in userIds)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is not null)
            {
                userDisplayNames[userId] = user.DisplayName;
            }
        }

        var items = entries.Select(e => new AuditLogDto(
            Id: e.Id,
            UserId: e.UserId,
            UserDisplayName: e.UserId.HasValue && userDisplayNames.TryGetValue(e.UserId.Value, out var name)
                ? name
                : null,
            EntityName: e.EntityName,
            EntityKey: e.EntityKey,
            Action: e.Action,
            OldValuesJson: e.OldValuesJson,
            NewValuesJson: e.NewValuesJson,
            IpAddress: e.IpAddress,
            CreatedAt: e.CreatedAt
        )).ToList();

        return new PagedAuditResult(items, totalCount, page, limit);
    }
}
