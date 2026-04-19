using BudgetTracker.Application.PriceBooks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Validation.AspNetCore;

namespace BudgetTracker.Api.Controllers;

/// <summary>
/// PriceBook CRUD + sürüm yaşam döngüsü endpoint'leri (00b §3.2).
/// Bir sözleşmeye bağlı PriceBook sürümleri için iki taban route kullanılır:
/// <c>/api/v1/contracts/{contractId}/price-books</c> (liste + create) ve
/// <c>/api/v1/price-books/{id}/...</c> (detay + bulk + approve).
/// </summary>
[ApiController]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public sealed class PriceBooksController : ControllerBase
{
    private readonly IPriceBookService _service;

    public PriceBooksController(IPriceBookService service)
    {
        _service = service;
    }

    [HttpGet("api/v1/contracts/{contractId:int}/price-books")]
    public async Task<IActionResult> GetByContract(
        int contractId, CancellationToken cancellationToken)
    {
        var result = await _service.GetByContractAsync(contractId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("api/v1/contracts/{contractId:int}/price-books")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> CreateDraft(
        int contractId,
        [FromBody] CreatePriceBookRequest request,
        CancellationToken cancellationToken)
    {
        var userId = this.GetRequiredUserId();
        var result = await _service.CreateDraftAsync(contractId, request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("api/v1/price-books/{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost("api/v1/price-books/{id:int}/items/bulk")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> BulkAddItems(
        int id,
        [FromBody] BulkAddItemsRequest request,
        CancellationToken cancellationToken)
    {
        var userId = this.GetRequiredUserId();
        var result = await _service.BulkAddItemsAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }

    [HttpPost("api/v1/price-books/{id:int}/approve")]
    [Authorize(Policy = "Cfo")]
    public async Task<IActionResult> Approve(int id, CancellationToken cancellationToken)
    {
        var userId = this.GetRequiredUserId();
        var result = await _service.ApproveAsync(id, userId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("api/v1/price-books/{id:int}/items")]
    public async Task<IActionResult> GetItems(
        int id,
        [FromQuery(Name = "product_code")] string? productCode,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetItemsAsync(id, productCode, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// CSV bulk import — multipart/form-data field adı <c>file</c>.
    /// RFC 4180 temel diyalekt + Türk Excel noktalı-virgül ayraç desteklenir.
    /// ReplaceExisting=true olarak Draft içindeki önceki kalemleri değiştirir.
    /// </summary>
    [HttpPost("api/v1/price-books/{id:int}/items/import")]
    [Authorize(Policy = "RequireFinanceRole")]
    public async Task<IActionResult> ImportCsv(
        int id,
        [FromForm] IFormFile file,
        [FromQuery] bool replaceExisting = true,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "file is required" });
        }
        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { error = "file exceeds 5MB limit" });
        }

        IReadOnlyList<PriceBookItemInput> items;
        try
        {
            using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream);
            items = PriceBookCsvParser.Parse(reader);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var userId = this.GetRequiredUserId();
        var request = new BulkAddItemsRequest(items, replaceExisting);
        var result = await _service.BulkAddItemsAsync(id, request, userId, cancellationToken);
        return Ok(result);
    }
}
