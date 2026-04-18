using BudgetTracker.Application.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ReportsController : ControllerBase
{
    private readonly IExcelExportService _excelExport;
    private readonly IExcelImportService _excelImport;
    private readonly IPdfReportService _pdfReport;

    public ReportsController(
        IExcelExportService excelExport,
        IExcelImportService excelImport,
        IPdfReportService pdfReport)
    {
        _excelExport = excelExport;
        _excelImport = excelImport;
        _pdfReport = pdfReport;
    }

    [HttpGet("budget/excel")]
    public async Task<IActionResult> ExportBudgetExcel(
        [FromQuery] int versionId, CancellationToken cancellationToken)
    {
        var bytes = await _excelExport.ExportBudgetEntriesAsync(versionId, cancellationToken);

        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"butce_v{versionId}.xlsx");
    }

    [HttpGet("management/pdf")]
    public async Task<IActionResult> ExportManagementPdf(
        [FromQuery] int versionId, CancellationToken cancellationToken)
    {
        var bytes = await _pdfReport.GenerateManagementReportAsync(versionId, cancellationToken);

        return File(bytes, "application/pdf", $"yonetim_raporu_v{versionId}.pdf");
    }

    [HttpPost("budget/import/preview")]
    [Authorize(Policy = "RequireFinanceRole")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    public async Task<IActionResult> PreviewBudgetExcel(
        [FromQuery] int versionId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Dosya yüklenmedi." });
        }

        var userId = GetUserId();

        await using var stream = file.OpenReadStream();
        var preview = await _excelImport.PreviewAsync(
            versionId, stream, file.Length, userId, cancellationToken);

        return Ok(preview);
    }

    [HttpPost("budget/import/commit")]
    [Authorize(Policy = "RequireFinanceRole")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    public async Task<IActionResult> CommitBudgetExcel(
        [FromQuery] int versionId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Dosya yüklenmedi." });
        }

        var userId = GetUserId();

        await using var stream = file.OpenReadStream();
        var result = await _excelImport.CommitAsync(
            versionId, stream, file.Length, userId, cancellationToken);

        return Ok(result);
    }

    private int GetUserId() => this.GetRequiredUserId();
}
