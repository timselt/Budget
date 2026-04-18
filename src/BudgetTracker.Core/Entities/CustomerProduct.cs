using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// Müşteri-ürün sözleşme bağı. Hangi ürünün hangi müşteride aktif olduğunu +
/// sözleşme meta'sını (komisyon oranı, birim fiyat, sözleşme tarihleri) tutar.
/// Aynı müşteri-ürün çiftinin farklı tarih aralıklarında tekrar aktifleşmesi
/// (renewals) mümkün — unique index StartDate dahil composite. Bkz. ADR-0013.
/// </summary>
public sealed class CustomerProduct : TenantEntity
{
    public int CustomerId { get; private set; }
    public int ProductId { get; private set; }
    public decimal? UnitPriceTry { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; }

    private CustomerProduct() { }

    public static CustomerProduct Create(
        int companyId,
        int customerId,
        int productId,
        DateTimeOffset createdAt,
        int? createdByUserId = null,
        decimal? unitPriceTry = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? notes = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        if (productId <= 0) throw new ArgumentOutOfRangeException(nameof(productId));
        ValidateUnitPrice(unitPriceTry);
        ValidateDateRange(startDate, endDate);

        var entity = new CustomerProduct
        {
            CustomerId = customerId,
            ProductId = productId,
            UnitPriceTry = unitPriceTry,
            StartDate = startDate,
            EndDate = endDate,
            Notes = notes,
            IsActive = true,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }

    public void Update(
        int actorUserId,
        DateTimeOffset updatedAt,
        bool isActive,
        decimal? unitPriceTry = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? notes = null)
    {
        ValidateUnitPrice(unitPriceTry);
        ValidateDateRange(startDate, endDate);

        UnitPriceTry = unitPriceTry;
        StartDate = startDate;
        EndDate = endDate;
        Notes = notes;
        IsActive = isActive;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private static void ValidateUnitPrice(decimal? price)
    {
        if (price is null) return;
        if (price < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(price),
                "unit price must be non-negative");
        }
    }

    private static void ValidateDateRange(DateOnly? start, DateOnly? end)
    {
        if (start is null || end is null) return;
        if (end.Value < start.Value)
        {
            throw new ArgumentException("end date must be on or after start date");
        }
    }
}
