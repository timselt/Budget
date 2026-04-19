using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Contracts;

namespace BudgetTracker.Core.Entities;

/// <summary>
/// Müşteri-ürün sözleşmesi (ADR-0014). CustomerProduct'tan evrildi:
/// kontrat kodu 14 segment'ini üreten metadata alanları + <see cref="Version"/>
/// + stored <see cref="ContractCode"/> kolonu eklendi. Mutation sonrasında
/// <see cref="ContractCode"/> otomatik güncellenir.
/// <para>
/// Mutabakat modülü 00b önkoşulu ile genişletildi: <see cref="ContractName"/>,
/// <see cref="CurrencyCode"/>, <see cref="Status"/> (4-state lifecycle) ve
/// türetilmiş <see cref="Flow"/>. <see cref="IsActive"/> geri uyumluluk için
/// korundu — <c>Status == Active</c> ile senkron tutulur.
/// </para>
/// </summary>
public sealed class Contract : TenantEntity
{
    // ----- Orijinal CustomerProduct alanları -----

    public int CustomerId { get; private set; }
    public int ProductId { get; private set; }
    public decimal? UnitPriceTry { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; }

    // ----- 00b Mutabakat modülü genişletmeleri -----

    /// <summary>İnsan okur ad (opsiyonel); yoksa UI <see cref="ContractCode"/> gösterir.</summary>
    public string? ContractName { get; private set; }

    /// <summary>ISO 4217 para birimi kodu. MVP'de "TRY" sabit.</summary>
    public string CurrencyCode { get; private set; } = "TRY";

    /// <summary>Yaşam döngüsü durumu. <see cref="IsActive"/> ile senkron.</summary>
    public ContractStatus Status { get; private set; }

    /// <summary>
    /// Sonlandırma gerekçesi (Terminated'a geçerken atanır). Domain-only alan;
    /// Notes'tan ayrı tutulur ki serbest not korunsun.
    /// </summary>
    public string? TerminationReason { get; private set; }

    /// <summary>Mutabakat akış ayrımı; <see cref="SalesType"/>'tan türetilir (DB'de yok).</summary>
    public ContractFlow Flow => ContractFlowMapper.FromSalesType(SalesType);

    // ----- ADR-0014: 14-segment kontrat kodu metadata'sı -----

    public BusinessLine BusinessLine { get; private set; }
    public SalesType SalesType { get; private set; }
    public Core.Enums.Contracts.ProductType ProductType { get; private set; }
    public VehicleType VehicleType { get; private set; }
    public ContractForm ContractForm { get; private set; }
    public Core.Enums.Contracts.ContractType ContractType { get; private set; }
    public PaymentFrequency PaymentFrequency { get; private set; }
    public AdjustmentClause AdjustmentClause { get; private set; }
    public ContractKind ContractKind { get; private set; }
    public ServiceArea ServiceArea { get; private set; }

    /// <summary>Revizyon versiyonu (ADR-0014 §2.3).</summary>
    public int Version { get; private set; }

    /// <summary>Stored 14-segment kontrat kodu; mutation sonrası regenerate.</summary>
    public string ContractCode { get; private set; } = default!;

    /// <summary>Revizyon sayacı (T2R5 UI için). Koda yansımaz.</summary>
    public int RevisionCount { get; private set; }

    /// <summary>
    /// ContractCode rendering için gerekli CustomerShortId — denormalized
    /// cache, DB'de kolon olarak tutulur (Customer.ShortId ile sync).
    /// </summary>
    public int CustomerShortId { get; private set; }

    private Contract() { }

    public static Contract Create(
        int companyId,
        int customerId,
        int customerShortId,
        int productId,
        BusinessLine businessLine,
        SalesType salesType,
        Core.Enums.Contracts.ProductType productType,
        VehicleType vehicleType,
        ContractForm contractForm,
        Core.Enums.Contracts.ContractType contractType,
        PaymentFrequency paymentFrequency,
        AdjustmentClause adjustmentClause,
        ContractKind contractKind,
        ServiceArea serviceArea,
        DateTimeOffset createdAt,
        int? createdByUserId = null,
        decimal? unitPriceTry = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? notes = null,
        string? contractName = null,
        string? currencyCode = null,
        ContractStatus initialStatus = ContractStatus.Active)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        if (productId <= 0) throw new ArgumentOutOfRangeException(nameof(productId));
        if (customerShortId is < 0 or > 99)
            throw new ArgumentOutOfRangeException(nameof(customerShortId), "short id 0-99");
        ValidateUnitPrice(unitPriceTry);
        ValidateDateRange(startDate, endDate);
        var normalizedCurrency = NormalizeCurrency(currencyCode);

        var code = Contracts.ContractCode.Build(
            businessLine, salesType, productType, vehicleType,
            customerShortId, contractForm, contractType, productId,
            paymentFrequency, adjustmentClause, contractKind, serviceArea,
            version: 1);

        var entity = new Contract
        {
            CustomerId = customerId,
            CustomerShortId = customerShortId,
            ProductId = productId,
            UnitPriceTry = unitPriceTry,
            StartDate = startDate,
            EndDate = endDate,
            Notes = notes,
            IsActive = initialStatus == ContractStatus.Active,
            ContractName = string.IsNullOrWhiteSpace(contractName) ? null : contractName.Trim(),
            CurrencyCode = normalizedCurrency,
            Status = initialStatus,
            BusinessLine = businessLine,
            SalesType = salesType,
            ProductType = productType,
            VehicleType = vehicleType,
            ContractForm = contractForm,
            ContractType = contractType,
            PaymentFrequency = paymentFrequency,
            AdjustmentClause = adjustmentClause,
            ContractKind = contractKind,
            ServiceArea = serviceArea,
            Version = 1,
            RevisionCount = 0,
            ContractCode = code.Value,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
        entity.CompanyId = companyId;
        return entity;
    }

    /// <summary>
    /// Eski CustomerProduct satırlarını Contract'a backfill için factory.
    /// Default değerler ADR-0014 §2.1 tablosu.
    /// </summary>
    public static Contract CreateFromLegacy(
        int companyId,
        int customerId,
        int customerShortId,
        int productId,
        DateTimeOffset createdAt,
        decimal? unitPriceTry,
        DateOnly? startDate,
        DateOnly? endDate,
        string? notes,
        bool isActive)
    {
        var contract = Create(
            companyId, customerId, customerShortId, productId,
            BusinessLine.Other, SalesType.Insurance,
            Core.Enums.Contracts.ProductType.Diger, VehicleType.None,
            ContractForm.ServiceBased, Core.Enums.Contracts.ContractType.PerPolicy,
            PaymentFrequency.UpFront, AdjustmentClause.WithoutClause,
            ContractKind.CleanCut, ServiceArea.Domestic,
            createdAt, createdByUserId: null,
            unitPriceTry: unitPriceTry, startDate: startDate, endDate: endDate,
            notes: notes,
            initialStatus: isActive ? ContractStatus.Active : ContractStatus.Terminated);
        if (!isActive)
        {
            contract.IsActive = false;
        }
        return contract;
    }

    /// <summary>Basit alan güncellemesi — metadata değişmez, kod değişmez.</summary>
    public void Update(
        int actorUserId,
        DateTimeOffset updatedAt,
        bool isActive,
        decimal? unitPriceTry = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        string? notes = null,
        string? contractName = null,
        string? currencyCode = null)
    {
        ValidateUnitPrice(unitPriceTry);
        ValidateDateRange(startDate, endDate);

        UnitPriceTry = unitPriceTry;
        StartDate = startDate;
        EndDate = endDate;
        Notes = notes;
        IsActive = isActive;
        if (contractName is not null)
        {
            ContractName = string.IsNullOrWhiteSpace(contractName) ? null : contractName.Trim();
        }
        if (currencyCode is not null)
        {
            CurrencyCode = NormalizeCurrency(currencyCode);
        }
        SyncStatusWithIsActive(updatedAt);
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>
    /// Draft → Active geçişi. Aktivasyon için <see cref="StartDate"/> zorunludur
    /// (lookup bu alanla period eşleşmesi yapar).
    /// </summary>
    public void Activate(int actorUserId, DateTimeOffset updatedAt)
    {
        if (Status == ContractStatus.Active) return;
        if (Status is ContractStatus.Expired or ContractStatus.Terminated)
        {
            throw new InvalidOperationException(
                $"Cannot activate contract in terminal status '{Status}'.");
        }
        if (StartDate is null)
        {
            throw new InvalidOperationException(
                "Activation requires StartDate to be set.");
        }
        Status = ContractStatus.Active;
        IsActive = true;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>Active/Draft → Terminated. <paramref name="effectiveDate"/> sonlandırma tarihi.</summary>
    public void Terminate(
        string reason,
        DateOnly effectiveDate,
        int actorUserId,
        DateTimeOffset updatedAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        if (Status is ContractStatus.Expired or ContractStatus.Terminated)
        {
            throw new InvalidOperationException(
                $"Contract already in terminal status '{Status}'.");
        }
        if (StartDate is not null && effectiveDate < StartDate.Value)
        {
            throw new ArgumentException(
                "Termination date cannot precede StartDate.", nameof(effectiveDate));
        }
        Status = ContractStatus.Terminated;
        IsActive = false;
        EndDate = effectiveDate;
        TerminationReason = reason.Trim();
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>
    /// Active → Expired otomatik geçişi (EffectiveTo geçtiğinde scheduled job çağırır).
    /// Elle <see cref="Terminate"/> ile karıştırılmamalı.
    /// </summary>
    public void Expire(int actorUserId, DateTimeOffset updatedAt)
    {
        if (Status != ContractStatus.Active) return;
        Status = ContractStatus.Expired;
        IsActive = false;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>
    /// Revizyon versiyonunu 1 artırır ve ContractCode'u regenerate eder
    /// (ADR-0014 §2.3 LimitChange / VehicleChange / PeriodRenewal).
    /// </summary>
    public void BumpVersion(int actorUserId, DateTimeOffset updatedAt)
    {
        Version++;
        RevisionCount++;
        ContractCode = BuildCode().Value;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>
    /// Prim değişikliği — sadece UnitPrice günceller, versiyon atlamaz,
    /// kontrat kodu korunur (ADR-0014 §2.3 PriceChange).
    /// </summary>
    public void RevisePriceOnly(
        decimal? newUnitPriceTry, int actorUserId, DateTimeOffset updatedAt)
    {
        ValidateUnitPrice(newUnitPriceTry);
        UnitPriceTry = newUnitPriceTry;
        RevisionCount++;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>
    /// Metadata segmentlerini değiştirir (örn. operasyonel düzeltme) ve kod
    /// regenerate edilir. Versiyon atlamaz.
    /// </summary>
    public void ReviseMetadata(
        int actorUserId,
        DateTimeOffset updatedAt,
        BusinessLine? businessLine = null,
        SalesType? salesType = null,
        Core.Enums.Contracts.ProductType? productType = null,
        VehicleType? vehicleType = null,
        ContractForm? contractForm = null,
        Core.Enums.Contracts.ContractType? contractType = null,
        PaymentFrequency? paymentFrequency = null,
        AdjustmentClause? adjustmentClause = null,
        ContractKind? contractKind = null,
        ServiceArea? serviceArea = null)
    {
        if (businessLine.HasValue) BusinessLine = businessLine.Value;
        if (salesType.HasValue) SalesType = salesType.Value;
        if (productType.HasValue) ProductType = productType.Value;
        if (vehicleType.HasValue) VehicleType = vehicleType.Value;
        if (contractForm.HasValue) ContractForm = contractForm.Value;
        if (contractType.HasValue) ContractType = contractType.Value;
        if (paymentFrequency.HasValue) PaymentFrequency = paymentFrequency.Value;
        if (adjustmentClause.HasValue) AdjustmentClause = adjustmentClause.Value;
        if (contractKind.HasValue) ContractKind = contractKind.Value;
        if (serviceArea.HasValue) ServiceArea = serviceArea.Value;

        ContractCode = BuildCode().Value;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    /// <summary>Customer.ShortId değişirse kontrat kodu regenerate.</summary>
    public void SyncCustomerShortId(
        int newShortId, int actorUserId, DateTimeOffset updatedAt)
    {
        if (newShortId is < 0 or > 99)
            throw new ArgumentOutOfRangeException(nameof(newShortId));
        CustomerShortId = newShortId;
        ContractCode = BuildCode().Value;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    private Contracts.ContractCode BuildCode() => Contracts.ContractCode.Build(
        BusinessLine, SalesType, ProductType, VehicleType,
        CustomerShortId, ContractForm, ContractType, ProductId,
        PaymentFrequency, AdjustmentClause, ContractKind, ServiceArea,
        Version);

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

    private static string NormalizeCurrency(string? code)
    {
        var value = string.IsNullOrWhiteSpace(code) ? "TRY" : code.Trim().ToUpperInvariant();
        if (value.Length != 3)
        {
            throw new ArgumentException("currency code must be ISO 4217 (3 letters)", nameof(code));
        }
        return value;
    }

    /// <summary>IsActive ↔ Status senkronizasyonu (geri uyumluluk için).</summary>
    private void SyncStatusWithIsActive(DateTimeOffset updatedAt)
    {
        if (IsActive && Status != ContractStatus.Active)
        {
            Status = ContractStatus.Active;
        }
        else if (!IsActive && Status == ContractStatus.Active)
        {
            Status = ContractStatus.Terminated;
        }
    }
}
