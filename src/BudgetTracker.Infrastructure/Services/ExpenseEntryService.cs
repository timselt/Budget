using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Expenses;
using BudgetTracker.Application.FxRates;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class ExpenseEntryService : IExpenseEntryService
{
    private readonly IApplicationDbContext _db;
    private readonly IFxConversionService _fx;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public ExpenseEntryService(
        IApplicationDbContext db,
        IFxConversionService fx,
        ITenantContext tenant,
        IClock clock)
    {
        _db = db;
        _fx = fx;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ExpenseEntryDto>> GetByVersionAsync(
        int versionId, int budgetYearId, CancellationToken cancellationToken)
    {
        return await _db.ExpenseEntries
            .Where(e => e.VersionId == versionId && e.BudgetYearId == budgetYearId)
            .Join(_db.ExpenseCategories, e => e.CategoryId, c => c.Id, (e, c) => new { e, c })
            .Select(x => new ExpenseEntryDto(
                x.e.Id, x.e.VersionId, x.e.BudgetYearId,
                x.e.CategoryId, x.c.Name,
                x.e.Month, x.e.EntryType.ToString().ToUpperInvariant(),
                x.e.AmountOriginal, x.e.CurrencyCode,
                x.e.AmountTryFixed, x.e.AmountTrySpot))
            .ToListAsync(cancellationToken);
    }

    public async Task<ExpenseEntryDto> CreateAsync(
        int budgetYearId,
        int? versionId,
        CreateExpenseEntryRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        if (versionId.HasValue)
        {
            await EnsureEditableVersionAsync(versionId.Value, cancellationToken);
        }

        var entryType = ParseEntryType(request.EntryType);
        var budgetYear = await GetBudgetYearAsync(budgetYearId, cancellationToken);

        var fxResult = await _fx.ConvertToTryAsync(
            request.AmountOriginal, request.CurrencyCode,
            budgetYear, request.Month, cancellationToken);

        var entry = ExpenseEntry.Create(
            _tenant.CurrentCompanyId!.Value,
            versionId,
            budgetYearId,
            request.CategoryId,
            request.Month,
            entryType,
            request.AmountOriginal,
            request.CurrencyCode,
            fxResult.AmountTryFixed,
            fxResult.AmountTrySpot,
            actorUserId,
            _clock.UtcNow,
            request.Notes);

        _db.ExpenseEntries.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(entry);
    }

    public async Task DeleteAsync(int entryId, int actorUserId, CancellationToken cancellationToken)
    {
        var entry = await _db.ExpenseEntries
            .FirstOrDefaultAsync(e => e.Id == entryId, cancellationToken)
            ?? throw new InvalidOperationException($"Expense entry {entryId} not found");

        if (entry.VersionId.HasValue)
        {
            await EnsureEditableVersionAsync(entry.VersionId.Value, cancellationToken);
        }

        entry.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureEditableVersionAsync(int versionId, CancellationToken cancellationToken)
    {
        var status = await _db.BudgetVersions
            .Where(v => v.Id == versionId)
            .Select(v => v.Status)
            .FirstOrDefaultAsync(cancellationToken);

        if (status is not (BudgetVersionStatus.Draft or BudgetVersionStatus.Rejected))
        {
            throw new InvalidOperationException(
                $"Budget version {versionId} is {status} and cannot be edited");
        }
    }

    private async Task<int> GetBudgetYearAsync(int budgetYearId, CancellationToken cancellationToken)
    {
        return await _db.BudgetYears
            .Where(y => y.Id == budgetYearId)
            .Select(y => y.Year)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static ExpenseEntryType ParseEntryType(string entryType) =>
        entryType.ToUpperInvariant() switch
        {
            "BUDGET" => ExpenseEntryType.Budget,
            "ACTUAL" => ExpenseEntryType.Actual,
            _ => throw new ArgumentException($"Invalid entry type: {entryType}")
        };

    private static ExpenseEntryDto ToDto(ExpenseEntry e) =>
        new(e.Id, e.VersionId, e.BudgetYearId,
            e.CategoryId, null,
            e.Month, e.EntryType.ToString().ToUpperInvariant(),
            e.AmountOriginal, e.CurrencyCode,
            e.AmountTryFixed, e.AmountTrySpot);
}
