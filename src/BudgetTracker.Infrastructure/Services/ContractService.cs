using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Contracts;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Contracts;
using Microsoft.EntityFrameworkCore;
using CoreContractCode = BudgetTracker.Core.Contracts.ContractCode;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// Kontrat CRUD + revizyon domain'i (ADR-0014) + 00b lifecycle (Activate/Terminate).
/// Yeni Contract oluştururken müşterinin ShortId'sini otomatik okur; yoksa şirket
/// için sıradaki boş ShortId'yi atar (lazy backfill).
/// </summary>
public sealed class ContractService : IContractService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;

    public ContractService(IApplicationDbContext db, ITenantContext tenant, IClock clock)
    {
        _db = db;
        _tenant = tenant;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ContractDto>> GetAllAsync(
        int? customerId,
        int? productId,
        string? flow,
        string? status,
        CancellationToken cancellationToken)
    {
        var query = _db.Contracts.AsQueryable();
        if (customerId.HasValue) query = query.Where(c => c.CustomerId == customerId.Value);
        if (productId.HasValue) query = query.Where(c => c.ProductId == productId.Value);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var parsedStatus = ParseEnum<ContractStatus>(status, nameof(status));
            query = query.Where(c => c.Status == parsedStatus);
        }
        if (!string.IsNullOrWhiteSpace(flow))
        {
            var parsedFlow = ParseEnum<ContractFlow>(flow, nameof(flow));
            // Türetilmiş alan — SalesType setine çeviriyoruz (DB kolonu yok).
            var matchingSalesTypes = Enum.GetValues<SalesType>()
                .Where(st => ContractFlowMapper.FromSalesType(st) == parsedFlow)
                .ToArray();
            query = query.Where(c => matchingSalesTypes.Contains(c.SalesType));
        }

        var rows = await (
            from c in query
            join cust in _db.Customers on c.CustomerId equals cust.Id
            join prod in _db.Products on c.ProductId equals prod.Id
            orderby c.CreatedAt descending
            select new ContractQueryRow(c, cust.Code, cust.Name, prod.Code, prod.Name))
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<ContractDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var row = await (
            from c in _db.Contracts
            where c.Id == id
            join cust in _db.Customers on c.CustomerId equals cust.Id
            join prod in _db.Products on c.ProductId equals prod.Id
            select new ContractQueryRow(c, cust.Code, cust.Name, prod.Code, prod.Name))
            .FirstOrDefaultAsync(cancellationToken);

        return row is null ? null : Map(row);
    }

    public async Task<ContractDto> CreateAsync(
        CreateContractRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var companyId = _tenant.CurrentCompanyId!.Value;
        var now = _clock.UtcNow;

        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {request.CustomerId} not found");

        // Lazy backfill: müşterinin ShortId'si yoksa (0) company başına
        // sequential atama — ADR-0014 §2.4.
        if (customer.ShortId == 0)
        {
            var nextShortId = await NextShortIdAsync(companyId, cancellationToken);
            customer.AssignShortId(nextShortId, actorUserId, now);
        }

        var initialStatus = string.IsNullOrWhiteSpace(request.InitialStatus)
            ? ContractStatus.Active
            : ParseEnum<ContractStatus>(request.InitialStatus, nameof(request.InitialStatus));

        var contract = Contract.Create(
            companyId,
            customer.Id, customer.ShortId, request.ProductId,
            ParseEnum<BusinessLine>(request.BusinessLine, nameof(request.BusinessLine)),
            ParseEnum<SalesType>(request.SalesType, nameof(request.SalesType)),
            ParseEnum<Core.Enums.Contracts.ProductType>(request.ProductType, nameof(request.ProductType)),
            ParseEnum<VehicleType>(request.VehicleType, nameof(request.VehicleType)),
            ParseEnum<ContractForm>(request.ContractForm, nameof(request.ContractForm)),
            ParseEnum<Core.Enums.Contracts.ContractType>(request.ContractType, nameof(request.ContractType)),
            ParseEnum<PaymentFrequency>(request.PaymentFrequency, nameof(request.PaymentFrequency)),
            ParseEnum<AdjustmentClause>(request.AdjustmentClause, nameof(request.AdjustmentClause)),
            ParseEnum<ContractKind>(request.ContractKind, nameof(request.ContractKind)),
            ParseEnum<ServiceArea>(request.ServiceArea, nameof(request.ServiceArea)),
            now, actorUserId,
            request.UnitPriceTry, request.StartDate, request.EndDate, request.Notes,
            request.ContractName, request.CurrencyCode, initialStatus);

        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(contract.Id, cancellationToken))!;
    }

    public async Task<ContractDto> UpdateAsync(
        int id, UpdateContractRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");

        contract.Update(
            actorUserId, _clock.UtcNow, request.IsActive,
            request.UnitPriceTry, request.StartDate, request.EndDate, request.Notes,
            request.ContractName, request.CurrencyCode);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<ContractDto> ReviseAsync(
        int id, ReviseContractRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");

        var changeType = ParseEnum<ContractChangeType>(request.ChangeType, nameof(request.ChangeType));
        var now = _clock.UtcNow;

        switch (changeType)
        {
            case ContractChangeType.PriceChange:
                contract.RevisePriceOnly(request.NewUnitPriceTry, actorUserId, now);
                break;
            case ContractChangeType.LimitChange:
            case ContractChangeType.LimitAndPrice:
            case ContractChangeType.VehicleChange:
            case ContractChangeType.PeriodRenewal:
                contract.BumpVersion(actorUserId, now);
                if (changeType == ContractChangeType.LimitAndPrice && request.NewUnitPriceTry.HasValue)
                {
                    contract.RevisePriceOnly(request.NewUnitPriceTry, actorUserId, now);
                }
                break;
            case ContractChangeType.CoverageChange:
                throw new InvalidOperationException(
                    "CoverageChange requires creating a NEW Contract with a NEW ProductId " +
                    "(ADR-0014 §2.3). Use POST /api/v1/contracts with the new product.");
            default:
                throw new ArgumentOutOfRangeException(nameof(request.ChangeType), changeType, null);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");

        contract.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ContractDto> ActivateAsync(
        int id, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");
        contract.Activate(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<ContractDto> TerminateAsync(
        int id, TerminateContractRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");
        contract.Terminate(request.Reason, request.EffectiveDate, actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<string> PreviewCodeAsync(
        CreateContractRequest request, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers
            .Where(c => c.Id == request.CustomerId)
            .Select(c => new { c.Id, c.ShortId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"Customer {request.CustomerId} not found");

        var companyId = _tenant.CurrentCompanyId!.Value;
        var shortId = customer.ShortId;
        if (shortId == 0)
        {
            shortId = await NextShortIdAsync(companyId, cancellationToken);
        }

        var code = CoreContractCode.Build(
            ParseEnum<BusinessLine>(request.BusinessLine, nameof(request.BusinessLine)),
            ParseEnum<SalesType>(request.SalesType, nameof(request.SalesType)),
            ParseEnum<Core.Enums.Contracts.ProductType>(request.ProductType, nameof(request.ProductType)),
            ParseEnum<VehicleType>(request.VehicleType, nameof(request.VehicleType)),
            shortId,
            ParseEnum<ContractForm>(request.ContractForm, nameof(request.ContractForm)),
            ParseEnum<Core.Enums.Contracts.ContractType>(request.ContractType, nameof(request.ContractType)),
            request.ProductId,
            ParseEnum<PaymentFrequency>(request.PaymentFrequency, nameof(request.PaymentFrequency)),
            ParseEnum<AdjustmentClause>(request.AdjustmentClause, nameof(request.AdjustmentClause)),
            ParseEnum<ContractKind>(request.ContractKind, nameof(request.ContractKind)),
            ParseEnum<ServiceArea>(request.ServiceArea, nameof(request.ServiceArea)),
            version: 1);
        return code.Value;
    }

    public ContractCodeBreakdownDto ParseCode(string code)
    {
        var parsed = CoreContractCode.Parse(code);
        return new ContractCodeBreakdownDto(
            parsed.Value,
            parsed.BusinessLine.ToString(),
            parsed.SalesType.ToString(),
            parsed.ProductType.ToString(),
            parsed.VehicleType.ToString(),
            parsed.CustomerShortId,
            parsed.ContractForm.ToString(),
            parsed.ContractType.ToString(),
            parsed.ProductId,
            parsed.PaymentFrequency.ToString(),
            parsed.AdjustmentClause.ToString(),
            parsed.ContractKind.ToString(),
            parsed.ServiceArea.ToString(),
            parsed.Version);
    }

    private async Task<int> NextShortIdAsync(int companyId, CancellationToken cancellationToken)
    {
        var maxInUse = await _db.Customers
            .Where(c => c.CompanyId == companyId)
            .Select(c => (int?)c.ShortId)
            .MaxAsync(cancellationToken) ?? 0;
        var next = maxInUse + 1;
        if (next > 99)
        {
            throw new InvalidOperationException(
                "Customer ShortId range exhausted (0-99). Bkz. ADR-0014 §2.4 — 3-haneye geçiş gerekli.");
        }
        return next;
    }

    private static T ParseEnum<T>(string value, string paramName) where T : struct, Enum
    {
        if (Enum.TryParse<T>(value, ignoreCase: true, out var result))
        {
            return result;
        }
        throw new ArgumentException($"Invalid {typeof(T).Name} value: '{value}'", paramName);
    }

    private static ContractDto Map(ContractQueryRow row) => new(
        row.Contract.Id, row.Contract.CustomerId, row.Contract.CustomerShortId,
        row.CustomerCode, row.CustomerName,
        row.Contract.ProductId, row.ProductCode, row.ProductName,
        row.Contract.ContractCode, row.Contract.Version, row.Contract.RevisionCount,
        row.Contract.BusinessLine.ToString(), row.Contract.SalesType.ToString(),
        row.Contract.ProductType.ToString(), row.Contract.VehicleType.ToString(),
        row.Contract.ContractForm.ToString(), row.Contract.ContractType.ToString(),
        row.Contract.PaymentFrequency.ToString(), row.Contract.AdjustmentClause.ToString(),
        row.Contract.ContractKind.ToString(), row.Contract.ServiceArea.ToString(),
        row.Contract.UnitPriceTry, row.Contract.StartDate, row.Contract.EndDate,
        row.Contract.Notes, row.Contract.IsActive,
        row.Contract.ContractName, row.Contract.CurrencyCode,
        row.Contract.Status.ToString(), row.Contract.Flow.ToString(),
        row.Contract.TerminationReason);

    private sealed record ContractQueryRow(
        Contract Contract,
        string CustomerCode,
        string CustomerName,
        string ProductCode,
        string ProductName);
}
