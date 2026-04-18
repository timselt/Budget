using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Contracts;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums.Contracts;
using Microsoft.EntityFrameworkCore;
using CoreContractCode = BudgetTracker.Core.Contracts.ContractCode;

namespace BudgetTracker.Infrastructure.Services;

/// <summary>
/// Kontrat CRUD + revizyon domain'i (ADR-0014). Yeni Contract oluştururken
/// müşterinin ShortId'sini otomatik okur; yoksa şirket için sıradaki boş
/// ShortId'yi atar (lazy backfill).
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
        int? customerId, int? productId, CancellationToken cancellationToken)
    {
        var query = _db.Contracts.AsQueryable();
        if (customerId.HasValue) query = query.Where(c => c.CustomerId == customerId.Value);
        if (productId.HasValue) query = query.Where(c => c.ProductId == productId.Value);

        var rows = await (
            from c in query
            join cust in _db.Customers on c.CustomerId equals cust.Id
            join prod in _db.Products on c.ProductId equals prod.Id
            orderby c.CreatedAt descending
            select new
            {
                c.Id, c.CustomerId, c.CustomerShortId,
                CustomerCode = cust.Code, CustomerName = cust.Name,
                c.ProductId, ProductCode = prod.Code, ProductName = prod.Name,
                c.ContractCode, c.Version, c.RevisionCount,
                c.BusinessLine, c.SalesType, c.ProductType, c.VehicleType,
                c.ContractForm, c.ContractType, c.PaymentFrequency,
                c.AdjustmentClause, c.ContractKind, c.ServiceArea,
                c.UnitPriceTry, c.StartDate, c.EndDate, c.Notes, c.IsActive
            })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new ContractDto(
            r.Id, r.CustomerId, r.CustomerShortId,
            r.CustomerCode, r.CustomerName,
            r.ProductId, r.ProductCode, r.ProductName,
            r.ContractCode, r.Version, r.RevisionCount,
            r.BusinessLine.ToString(), r.SalesType.ToString(),
            r.ProductType.ToString(), r.VehicleType.ToString(),
            r.ContractForm.ToString(), r.ContractType.ToString(),
            r.PaymentFrequency.ToString(), r.AdjustmentClause.ToString(),
            r.ContractKind.ToString(), r.ServiceArea.ToString(),
            r.UnitPriceTry, r.StartDate, r.EndDate, r.Notes, r.IsActive))
            .ToList();
    }

    public async Task<ContractDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var row = await (
            from c in _db.Contracts
            where c.Id == id
            join cust in _db.Customers on c.CustomerId equals cust.Id
            join prod in _db.Products on c.ProductId equals prod.Id
            select new
            {
                c.Id, c.CustomerId, c.CustomerShortId,
                CustomerCode = cust.Code, CustomerName = cust.Name,
                c.ProductId, ProductCode = prod.Code, ProductName = prod.Name,
                c.ContractCode, c.Version, c.RevisionCount,
                c.BusinessLine, c.SalesType, c.ProductType, c.VehicleType,
                c.ContractForm, c.ContractType, c.PaymentFrequency,
                c.AdjustmentClause, c.ContractKind, c.ServiceArea,
                c.UnitPriceTry, c.StartDate, c.EndDate, c.Notes, c.IsActive
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        return new ContractDto(
            row.Id, row.CustomerId, row.CustomerShortId,
            row.CustomerCode, row.CustomerName,
            row.ProductId, row.ProductCode, row.ProductName,
            row.ContractCode, row.Version, row.RevisionCount,
            row.BusinessLine.ToString(), row.SalesType.ToString(),
            row.ProductType.ToString(), row.VehicleType.ToString(),
            row.ContractForm.ToString(), row.ContractType.ToString(),
            row.PaymentFrequency.ToString(), row.AdjustmentClause.ToString(),
            row.ContractKind.ToString(), row.ServiceArea.ToString(),
            row.UnitPriceTry, row.StartDate, row.EndDate, row.Notes, row.IsActive);
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

        var contract = Contract.Create(
            companyId,
            customer.Id, customer.ShortId, request.ProductId,
            Parse<BusinessLine>(request.BusinessLine),
            Parse<SalesType>(request.SalesType),
            Parse<Core.Enums.Contracts.ProductType>(request.ProductType),
            Parse<VehicleType>(request.VehicleType),
            Parse<ContractForm>(request.ContractForm),
            Parse<Core.Enums.Contracts.ContractType>(request.ContractType),
            Parse<PaymentFrequency>(request.PaymentFrequency),
            Parse<AdjustmentClause>(request.AdjustmentClause),
            Parse<ContractKind>(request.ContractKind),
            Parse<ServiceArea>(request.ServiceArea),
            now, actorUserId,
            request.UnitPriceTry, request.StartDate, request.EndDate, request.Notes);

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
            request.UnitPriceTry, request.StartDate, request.EndDate, request.Notes);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<ContractDto> ReviseAsync(
        int id, ReviseContractRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Contract {id} not found");

        var changeType = Parse<ContractChangeType>(request.ChangeType);
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
            Parse<BusinessLine>(request.BusinessLine),
            Parse<SalesType>(request.SalesType),
            Parse<Core.Enums.Contracts.ProductType>(request.ProductType),
            Parse<VehicleType>(request.VehicleType),
            shortId,
            Parse<ContractForm>(request.ContractForm),
            Parse<Core.Enums.Contracts.ContractType>(request.ContractType),
            request.ProductId,
            Parse<PaymentFrequency>(request.PaymentFrequency),
            Parse<AdjustmentClause>(request.AdjustmentClause),
            Parse<ContractKind>(request.ContractKind),
            Parse<ServiceArea>(request.ServiceArea),
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

    private static T Parse<T>(string value) where T : struct, Enum
    {
        if (Enum.TryParse<T>(value, ignoreCase: true, out var result))
        {
            return result;
        }
        throw new ArgumentException($"Invalid {typeof(T).Name} value: '{value}'", nameof(value));
    }
}
