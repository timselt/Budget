using BudgetTracker.Application.Reconciliation.Batches;
using BudgetTracker.Application.Reconciliation.Import;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// Mutabakat batch import + listele + detay + sil endpoint'leri (Faz 1
/// spec §3 + Sprint 1 prompt §1). Tüm endpoint'ler tenant-scoped (RLS +
/// CompanyId filter); policy'ler 00c spec'inde tanımlı.
/// </summary>
[ApiController]
[Route("api/v1/reconciliation/batches")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class ReconciliationBatchesController : ControllerBase
{
    private readonly IReconciliationBatchService _service;
    private readonly ITenantContext _tenant;

    public ReconciliationBatchesController(
        IReconciliationBatchService service,
        ITenantContext tenant)
    {
        _service = service;
        _tenant = tenant;
    }

    /// <summary>POST /api/v1/reconciliation/batches — multipart upload.</summary>
    [HttpPost]
    [Authorize(Policy = "Reconciliation.Import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26_214_400)] // 25 MB
    public async Task<IActionResult> Import(
        [FromForm] CreateBatchFormRequest form,
        [FromServices] IValidator<CreateBatchFormRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(form, cancellationToken);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var userId = this.GetRequiredUserId();

        try
        {
            await using var stream = form.File.OpenReadStream();
            // Stream seekable değilse hash + reader için belleğe al.
            using var seekable = stream.CanSeek
                ? (Stream)stream
                : await CopyToMemoryStreamAsync(stream, cancellationToken);

            var detail = await _service.ImportAsync(
                fileStream: seekable,
                fileName: form.File.FileName,
                flow: form.Flow,
                periodCode: form.PeriodCode,
                sourceType: form.SourceType,
                companyId: companyId,
                importedByUserId: userId,
                notes: form.Notes,
                cancellationToken: cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = detail.Id }, detail);
        }
        catch (DuplicateImportException ex)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Duplicate import",
                Detail = ex.Message,
                Type = "https://api.tag.local/errors/duplicate-import",
                Extensions = { ["existing_batch_id"] = ex.ExistingBatchId },
            });
        }
        catch (ImportReadException ex)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Unreadable import file",
                Detail = ex.Message,
                Type = "https://api.tag.local/errors/import-read-failed",
            });
        }
    }

    /// <summary>GET /api/v1/reconciliation/batches?flow=&period_code=&status= </summary>
    [HttpGet]
    [Authorize(Policy = "Reconciliation.ViewReports")]
    public async Task<IActionResult> List(
        [FromQuery] ReconciliationFlow? flow,
        [FromQuery(Name = "period_code")] string? periodCode,
        [FromQuery] ReconciliationBatchStatus? status,
        CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var query = new BatchListQuery(flow, periodCode, status);
        var result = await _service.ListAsync(query, companyId, cancellationToken);
        return Ok(result);
    }

    /// <summary>GET /api/v1/reconciliation/batches/{id}</summary>
    [HttpGet("{id:int}")]
    [Authorize(Policy = "Reconciliation.ViewReports")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var detail = await _service.GetByIdAsync(id, companyId, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    /// <summary>
    /// POST /api/v1/reconciliation/batches/{id}/parse
    /// Sprint 1: import zaten atomic (Draft + Parsed); reparse Sprint 2'ye
    /// bırakıldı. Endpoint placeholder — 501 döner.
    /// </summary>
    [HttpPost("{id:int}/parse")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public IActionResult Reparse(int id) => StatusCode(
        StatusCodes.Status501NotImplemented,
        new ProblemDetails
        {
            Status = StatusCodes.Status501NotImplemented,
            Title = "Reparse not yet implemented",
            Detail = "Sprint 1: import is atomic. Reparse functionality lands in Sprint 2.",
        });

    /// <summary>DELETE /api/v1/reconciliation/batches/{id} — sadece Draft.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var userId = this.GetRequiredUserId();

        try
        {
            var deleted = await _service.DeleteDraftAsync(id, companyId, userId, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Cannot delete batch",
                Detail = ex.Message,
            });
        }
    }

    /// <summary>
    /// GET /api/v1/reconciliation/batches/{id}/unmatched-customers — Sprint 2 Task 8.
    /// Customer eşleşmeyen benzersiz external_customer_ref'ler + satır sayıları.
    /// </summary>
    [HttpGet("{id:int}/unmatched-customers")]
    [Authorize(Policy = "Reconciliation.ViewReports")]
    public async Task<IActionResult> GetUnmatchedCustomers(int id, CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var result = await _service.GetUnmatchedCustomersAsync(id, companyId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/v1/reconciliation/batches/{id}/unmatched-customers/{ref}/link — Sprint 2 Task 8.
    /// Customer'a external_ref bağlar + autoCreator idempotent re-run (yeni Case/Line).
    /// </summary>
    [HttpPost("{id:int}/unmatched-customers/{externalRef}/link")]
    [Authorize(Policy = "Reconciliation.Manage")]
    public async Task<IActionResult> LinkUnmatchedCustomer(
        int id,
        string externalRef,
        [FromBody] LinkUnmatchedCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (request.CustomerId <= 0)
            return BadRequest(new { error = "customerId > 0 required" });
        if (string.IsNullOrWhiteSpace(externalRef))
            return BadRequest(new { error = "externalRef required" });

        var companyId = _tenant.CurrentCompanyId
            ?? throw new InvalidOperationException("tenant context missing company_id");
        var userId = this.GetRequiredUserId();

        try
        {
            var result = await _service.LinkUnmatchedCustomerAsync(
                id, externalRef, request.CustomerId, companyId, userId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<MemoryStream> CopyToMemoryStreamAsync(
        Stream source, CancellationToken cancellationToken)
    {
        var ms = new MemoryStream();
        await source.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;
        return ms;
    }
}

/// <summary>
/// Multipart form upload — flow + period_code + source_type + file + notes.
/// API katmanında çünkü <see cref="IFormFile"/> reference'ı.
/// </summary>
public sealed class CreateBatchFormRequest
{
    public IFormFile File { get; set; } = default!;
    public ReconciliationFlow Flow { get; set; }
    public string PeriodCode { get; set; } = string.Empty;
    public ReconciliationSourceType SourceType { get; set; }
    public string? Notes { get; set; }
}

public sealed class CreateBatchFormRequestValidator : AbstractValidator<CreateBatchFormRequest>
{
    private const long MaxFileSizeBytes = 25L * 1024 * 1024;

    public CreateBatchFormRequestValidator()
    {
        RuleFor(x => x.File).NotNull().WithMessage("file is required");

        When(x => x.File is not null, () =>
        {
            RuleFor(x => x.File.Length)
                .GreaterThan(0).WithMessage("file is empty")
                .LessThanOrEqualTo(MaxFileSizeBytes)
                .WithMessage($"file too large; max {MaxFileSizeBytes / (1024 * 1024)} MB");

            RuleFor(x => x.File.FileName)
                .NotEmpty()
                .Must(IsSupportedExtension)
                .WithMessage("only .xlsx and .csv are supported");
        });

        RuleFor(x => x.PeriodCode)
            .NotEmpty()
            .Must(DateFormatDetector.IsValidPeriodCode)
            .WithMessage("period_code must be YYYY-MM (year 2000-2100, month 01-12)");

        RuleFor(x => x.Flow).IsInEnum();
        RuleFor(x => x.SourceType).IsInEnum();
        RuleFor(x => x.Notes).MaximumLength(1000);
    }

    private static bool IsSupportedExtension(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext is ".xlsx" or ".csv";
    }
}
