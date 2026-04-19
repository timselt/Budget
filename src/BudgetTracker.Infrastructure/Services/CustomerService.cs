using System.Text.Json;
using BudgetTracker.Application.Audit;
using BudgetTracker.Application.Common.Abstractions;
using BudgetTracker.Application.Customers;
using BudgetTracker.Core.Common;
using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetTracker.Infrastructure.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly IApplicationDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public CustomerService(
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

    public async Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await (
            from customer in _db.Customers
            join segment in _db.Segments on customer.SegmentId equals segment.Id
            select new CustomerDto(
                customer.Id,
                customer.Code,
                customer.Name,
                customer.CategoryCode,
                customer.SubCategory,
                customer.TaxId,
                customer.TaxOffice,
                customer.SegmentId,
                segment.Name,
                customer.StartDate,
                customer.EndDate,
                customer.IsGroupInternal,
                customer.AccountManager,
                customer.DefaultCurrencyCode,
                customer.IsActive,
                customer.ExternalCustomerRef,
                customer.ExternalSourceSystem,
                customer.ExternalRefVerifiedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await (
            from customer in _db.Customers
            join segment in _db.Segments on customer.SegmentId equals segment.Id
            where customer.Id == id
            select new CustomerDto(
                customer.Id,
                customer.Code,
                customer.Name,
                customer.CategoryCode,
                customer.SubCategory,
                customer.TaxId,
                customer.TaxOffice,
                customer.SegmentId,
                segment.Name,
                customer.StartDate,
                customer.EndDate,
                customer.IsGroupInternal,
                customer.AccountManager,
                customer.DefaultCurrencyCode,
                customer.IsActive,
                customer.ExternalCustomerRef,
                customer.ExternalSourceSystem,
                customer.ExternalRefVerifiedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CustomerDto> CreateAsync(
        CreateCustomerRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = Customer.Create(
            _tenant.CurrentCompanyId!.Value,
            request.Code,
            request.Name,
            request.SegmentId,
            actorUserId,
            _clock.UtcNow,
            request.CategoryCode,
            request.SubCategory,
            request.TaxId,
            request.TaxOffice,
            request.StartDate,
            request.EndDate,
            request.IsGroupInternal,
            request.AccountManager,
            request.DefaultCurrencyCode,
            notes: request.Notes);

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(customer, null);
    }

    public async Task<CustomerDto> UpdateAsync(
        int id, UpdateCustomerRequest request, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {id} not found");

        customer.Update(
            request.Name,
            request.SegmentId,
            request.CategoryCode,
            request.SubCategory,
            request.TaxId,
            request.TaxOffice,
            request.StartDate,
            request.EndDate,
            request.IsGroupInternal,
            request.AccountManager,
            request.DefaultCurrencyCode,
            request.Notes,
            request.IsActive,
            actorUserId,
            _clock.UtcNow);

        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(customer, null);
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {id} not found");

        customer.MarkDeleted(actorUserId, _clock.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<CustomerDto> LinkExternalAsync(
        int id,
        LinkExternalCustomerRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new InvalidOperationException($"Customer {id} not found");

        var before = new
        {
            customer.ExternalCustomerRef,
            customer.ExternalSourceSystem,
            customer.ExternalRefVerifiedAt,
            customer.ExternalRefVerifiedByUserId
        };

        var now = _clock.UtcNow;
        customer.LinkExternalRef(request.ExternalRef, request.SourceSystem, actorUserId, now);

        await _db.SaveChangesAsync(cancellationToken);

        var after = new
        {
            customer.ExternalCustomerRef,
            customer.ExternalSourceSystem,
            customer.ExternalRefVerifiedAt,
            customer.ExternalRefVerifiedByUserId
        };

        await _audit.LogAsync(new AuditEvent(
            EntityName: AuditEntityNames.Customer,
            EntityKey: customer.Id.ToString(System.Globalization.CultureInfo.InvariantCulture),
            Action: AuditActions.CustomerExternalRefLinked,
            CompanyId: customer.CompanyId,
            UserId: actorUserId,
            OldValuesJson: JsonSerializer.Serialize(before),
            NewValuesJson: JsonSerializer.Serialize(after)),
            cancellationToken);

        return ToDto(customer, null);
    }

    public async Task<CustomerLookupDto?> LookupByExternalRefAsync(
        string externalRef, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalRef))
        {
            return null;
        }

        var trimmed = externalRef.Trim();

        return await (
            from customer in _db.Customers
            where customer.ExternalCustomerRef == trimmed
            select new CustomerLookupDto(
                customer.Id,
                customer.Code,
                customer.Name,
                customer.ExternalCustomerRef!,
                customer.ExternalSourceSystem!,
                customer.ExternalRefVerifiedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static CustomerDto ToDto(Customer customer, string? segmentName) => new(
        customer.Id,
        customer.Code,
        customer.Name,
        customer.CategoryCode,
        customer.SubCategory,
        customer.TaxId,
        customer.TaxOffice,
        customer.SegmentId,
        segmentName,
        customer.StartDate,
        customer.EndDate,
        customer.IsGroupInternal,
        customer.AccountManager,
        customer.DefaultCurrencyCode,
        customer.IsActive,
        customer.ExternalCustomerRef,
        customer.ExternalSourceSystem,
        customer.ExternalRefVerifiedAt);
}
