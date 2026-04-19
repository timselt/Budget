using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Customers;
using BudgetTracker.Application.Reports;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CustomerImportService : ICustomerImportService
{
    private static readonly HashSet<string> SummaryTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "OZET",
        "ÖZET",
        "KATEGORI",
        "KATEGORİ",
        "TOPLAM",
    };

    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public CustomerImportService(
        IApplicationDbContext db,
        ITenantContext tenant,
        IClock clock,
        IAuditLogger audit)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
        _audit = audit;
    }

    public async Task<CustomerImportPreview> PreviewAsync(
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();

        var segments = await LoadSegmentMapAsync(cancellationToken);
        var existingCodes = await LoadExistingCodesAsync(companyId, cancellationToken);

        var parsed = ParseWorksheet(worksheet, segments, existingCodes);
        EnforceLimits(streamLength, parsed.TotalRows);

        await _audit.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.Customer,
            EntityKey: "bulk-import",
            Action: AuditActions.ImportPreviewed,
            CompanyId: companyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new
            {
                totalRows = parsed.TotalRows,
                validRows = parsed.ValidRows,
                errorRows = parsed.Errors.Count,
            })),
            cancellationToken);

        return new CustomerImportPreview(
            parsed.TotalRows,
            parsed.ValidRows,
            parsed.Errors.Count,
            parsed.Errors,
            parsed.Warnings);
    }

    public async Task<CustomerImportResult> CommitAsync(
        Stream excelStream,
        long streamLength,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();

        var segments = await LoadSegmentMapAsync(cancellationToken);
        var existingCodes = await LoadExistingCodesAsync(companyId, cancellationToken);

        var parsed = ParseWorksheet(worksheet, segments, existingCodes);
        EnforceLimits(streamLength, parsed.TotalRows);

        var now = _clock.UtcNow;
        var imported = 0;
        var skipped = 0;

        foreach (var row in parsed.Rows)
        {
            if (existingCodes.Contains(row.Code))
            {
                skipped++;
                continue;
            }

            var customer = Customer.Create(
                companyId,
                row.Code,
                row.Name,
                row.SegmentId,
                actorUserId,
                now,
                defaultCurrencyCode: "TRY",
                notes: $"Imported from Excel ({row.SourceSheet})");

            _db.Customers.Add(customer);
            existingCodes.Add(row.Code);
            imported++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        await _audit.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.Customer,
            EntityKey: "bulk-import",
            Action: AuditActions.ImportCommitted,
            CompanyId: companyId,
            UserId: actorUserId,
            NewValuesJson: JsonSerializer.Serialize(new { imported, skipped })),
            cancellationToken);

        return new CustomerImportResult(imported, skipped, parsed.Warnings);
    }

    private static void EnforceLimits(long streamLength, int rowCount)
    {
        if (streamLength > ImportLimits.MaxBytes || rowCount > ImportLimits.MaxRows)
        {
            throw new ImportFileTooLargeException(streamLength, rowCount);
        }
    }

    private async Task<Dictionary<string, int>> LoadSegmentMapAsync(CancellationToken cancellationToken)
    {
        var segments = await _db.Segments
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var segment in segments)
        {
            map[Normalize(segment.Name)] = segment.Id;
            map[Normalize(segment.Code)] = segment.Id;
        }

        // Excel category aliases
        if (segments.FirstOrDefault(s => Normalize(s.Name) == "FILOYONETIMI") is { } filo)
        {
            map["FILO"] = filo.Id;
        }

        return map;
    }

    private async Task<HashSet<string>> LoadExistingCodesAsync(int companyId, CancellationToken cancellationToken)
    {
        var codes = await _db.Customers
            .AsNoTracking()
            .Where(c => c.CompanyId == companyId)
            .Select(c => c.Code)
            .ToListAsync(cancellationToken);

        return codes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToUpperInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private ParsedImport ParseWorksheet(
        IXLWorksheet worksheet,
        IReadOnlyDictionary<string, int> segments,
        ISet<string> existingCodes)
    {
        var headerMap = ResolveHeaders(worksheet);
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;
        var errors = new List<CustomerImportRowError>();
        var warnings = new List<string>();
        var rows = new List<ParsedCustomerRow>();

        for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++)
        {
            var code = worksheet.Cell(rowNumber, headerMap.Code).GetString().Trim();
            var name = worksheet.Cell(rowNumber, headerMap.Name).GetString().Trim();
            var category = worksheet.Cell(rowNumber, headerMap.Category).GetString().Trim();

            if (IsIgnorableSummaryRow(code, name, category))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(category))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category))
            {
                errors.Add(new CustomerImportRowError(rowNumber, "missing_required", "Kod, Firma Adı ve Kategori zorunlu."));
                continue;
            }

            var normalizedCategory = Normalize(category);
            if (!segments.TryGetValue(normalizedCategory, out var segmentId))
            {
                errors.Add(new CustomerImportRowError(rowNumber, "unknown_category", $"Kategori eşleşmedi: '{category}'"));
                continue;
            }

            var normalizedCode = code.Trim().ToUpperInvariant();
            if (rows.Any(r => r.Code.Equals(normalizedCode, StringComparison.OrdinalIgnoreCase)))
            {
                warnings.Add($"Satır {rowNumber}: Kod dosya içinde tekrar ediyor — '{code}'");
                continue;
            }

            if (existingCodes.Contains(normalizedCode))
            {
                warnings.Add($"Satır {rowNumber}: Kod zaten sistemde var — '{code}'");
                continue;
            }

            rows.Add(new ParsedCustomerRow(
                normalizedCode,
                name.Trim(),
                segmentId,
                worksheet.Name));
        }

        return new ParsedImport(rows.Count, rows.Count, errors, warnings, rows);
    }

    private static HeaderMap ResolveHeaders(IXLWorksheet worksheet)
    {
        var firstRow = worksheet.Row(1);
        var headerLookup = firstRow.CellsUsed()
            .ToDictionary(
                cell => Normalize(cell.GetString()),
                cell => cell.Address.ColumnNumber,
                StringComparer.OrdinalIgnoreCase);

        var code = FindHeader(headerLookup, "KOD");
        var name = FindHeader(headerLookup, "FIRMAADI");
        var category = FindHeader(headerLookup, "KATEGORI");

        return new HeaderMap(code, name, category);
    }

    private static int FindHeader(IReadOnlyDictionary<string, int> headerLookup, string key)
    {
        if (headerLookup.TryGetValue(key, out var column))
        {
            return column;
        }

        throw new InvalidOperationException($"Excel başlığında zorunlu kolon bulunamadı: {key}");
    }

    private static bool IsIgnorableSummaryRow(string code, string name, string category)
    {
        var normalizedCode = Normalize(code);
        var normalizedCategory = Normalize(category);

        if (SummaryTokens.Contains(normalizedCode))
        {
            return true;
        }

        if (normalizedCode is "SIGORTA" or "OTOMOTIV" or "FILO" or "ALTERNATIF" && int.TryParse(name, out _))
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(category))
        {
            return true;
        }

        if (normalizedCategory == "BUTCE2026")
        {
            return true;
        }

        return false;
    }

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Trim()
            .ToUpperInvariant()
            .Replace("İ", "I")
            .Replace("İ", "I")
            .Replace("Ş", "S")
            .Replace("Ğ", "G")
            .Replace("Ü", "U")
            .Replace("Ö", "O")
            .Replace("Ç", "C")
            .Replace(" ", string.Empty);
    }

    private sealed record HeaderMap(int Code, int Name, int Category);
    private sealed record ParsedCustomerRow(string Code, string Name, int SegmentId, string SourceSheet);
    private sealed record ParsedImport(
        int TotalRows,
        int ValidRows,
        IReadOnlyList<CustomerImportRowError> Errors,
        IReadOnlyList<string> Warnings,
        IReadOnlyList<ParsedCustomerRow> Rows);
}
