using BudgetTracker.Core.Enums.Contracts;

namespace BudgetTracker.Core.Contracts;

/// <summary>
/// Tur Assist 14-segment kontrat kodu (ADR-0014). Örnek:
/// <c>TA1SGK0B000101010000013652CC1-V1</c>.
/// </summary>
/// <remarks>
/// <para>
/// Immutable value object. <see cref="Build"/> segmentlerden kodu üretir;
/// <see cref="Parse"/> stringi segmentlere ayırır.
/// </para>
/// <para>
/// Format (sabit uzunluk gövde: 30 karakter + <c>-V{n}</c> son eki):
/// </para>
/// <code>
/// [TA][BL:1][ST:2][PT:2][VT:3][CID:2][CF:2][CT:2][PID:7][PF:3][AC:1][CK:2][SA:1]-V{n}
/// </code>
/// </remarks>
public sealed record ContractCode
{
    /// <summary>Sabit şirket öneki — <c>TA</c> (Tur Assist).</summary>
    public const string CompanyPrefix = "TA";

    /// <summary>
    /// Kontrat kodu gövdesinin sabit uzunluğu (suffix hariç). 30 karakter:
    /// TA(2) + BL(1) + ST(2) + PT(2) + VT(3) + CID(2) + CF(2) + CT(2)
    /// + PID(7) + PF(3) + AC(1) + CK(2) + SA(1). ADR-0014 §2.5: ProductId
    /// 7 haneli (max 9,999,999 ürün).
    /// </summary>
    public const int BodyLength = 30;

    public BusinessLine BusinessLine { get; }
    public SalesType SalesType { get; }
    public ProductType ProductType { get; }
    public VehicleType VehicleType { get; }

    /// <summary>
    /// Müşterinin company başına sequential 2-haneli short ID'si (0-99).
    /// ADR-0014 §2.4.
    /// </summary>
    public int CustomerShortId { get; }

    public ContractForm ContractForm { get; }
    public ContractType ContractType { get; }

    /// <summary>Ürünün 7-haneli zero-padded ID'si (1-9999999).</summary>
    public int ProductId { get; }

    public PaymentFrequency PaymentFrequency { get; }
    public AdjustmentClause AdjustmentClause { get; }
    public ContractKind ContractKind { get; }
    public ServiceArea ServiceArea { get; }

    /// <summary>Kontratın revizyon versiyonu (1'den başlar).</summary>
    public int Version { get; }

    /// <summary>Kontrat kodunun tam string gösterimi.</summary>
    public string Value { get; }

    private ContractCode(
        BusinessLine businessLine,
        SalesType salesType,
        ProductType productType,
        VehicleType vehicleType,
        int customerShortId,
        ContractForm contractForm,
        ContractType contractType,
        int productId,
        PaymentFrequency paymentFrequency,
        AdjustmentClause adjustmentClause,
        ContractKind contractKind,
        ServiceArea serviceArea,
        int version,
        string value)
    {
        BusinessLine = businessLine;
        SalesType = salesType;
        ProductType = productType;
        VehicleType = vehicleType;
        CustomerShortId = customerShortId;
        ContractForm = contractForm;
        ContractType = contractType;
        ProductId = productId;
        PaymentFrequency = paymentFrequency;
        AdjustmentClause = adjustmentClause;
        ContractKind = contractKind;
        ServiceArea = serviceArea;
        Version = version;
        Value = value;
    }

    /// <summary>
    /// Segmentlerden kontrat kodu üretir. Tüm enum değerleri geçerli olmalı;
    /// <paramref name="customerShortId"/> 0-99 aralığında, <paramref name="productId"/>
    /// 1-9999999 aralığında, <paramref name="version"/> 1 veya üzeri olmalı.
    /// </summary>
    public static ContractCode Build(
        BusinessLine businessLine,
        SalesType salesType,
        ProductType productType,
        VehicleType vehicleType,
        int customerShortId,
        ContractForm contractForm,
        ContractType contractType,
        int productId,
        PaymentFrequency paymentFrequency,
        AdjustmentClause adjustmentClause,
        ContractKind contractKind,
        ServiceArea serviceArea,
        int version)
    {
        ValidateCustomerShortId(customerShortId);
        ValidateProductId(productId);
        ValidateVersion(version);

        var value = string.Concat(
            CompanyPrefix,
            businessLine.ToCode(),
            salesType.ToCode(),
            productType.ToCode(),
            vehicleType.ToCode(),
            customerShortId.ToString("D2"),
            contractForm.ToCode(),
            contractType.ToCode(),
            productId.ToString("D7"),
            paymentFrequency.ToCode(),
            adjustmentClause.ToCode(),
            contractKind.ToCode(),
            serviceArea.ToCode(),
            "-V",
            version.ToString());

        return new ContractCode(
            businessLine, salesType, productType, vehicleType,
            customerShortId, contractForm, contractType, productId,
            paymentFrequency, adjustmentClause, contractKind, serviceArea,
            version, value);
    }

    /// <summary>
    /// Stringi 14 segmente ayırır. Bozuk format ya da tanımsız kod değerleri
    /// <see cref="ArgumentException"/> fırlatır.
    /// </summary>
    /// <remarks>
    /// ADR-0014 §2.7: Payment frequency için hem <c>T365</c> hem <c>365</c>
    /// kabul edilir; ancak <c>T365</c> gelen input <see cref="ContractCode.Value"/>
    /// ile değil, normalize edilmiş (<c>365</c>) form ile döner.
    /// </remarks>
    public static ContractCode Parse(string code)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        var dashIndex = code.IndexOf("-V", StringComparison.Ordinal);
        if (dashIndex < 0)
        {
            throw new ArgumentException(
                "contract code must contain '-V{version}' suffix", nameof(code));
        }

        var body = code[..dashIndex];
        var versionSuffix = code[(dashIndex + 2)..];

        if (body.Length != BodyLength)
        {
            throw new ArgumentException(
                $"contract code body must be exactly {BodyLength} characters, got {body.Length}",
                nameof(code));
        }

        if (!body.StartsWith(CompanyPrefix, StringComparison.Ordinal))
        {
            throw new ArgumentException(
                $"contract code must start with '{CompanyPrefix}'", nameof(code));
        }

        if (!int.TryParse(versionSuffix, out var version) || version < 1)
        {
            throw new ArgumentException(
                $"contract code version must be a positive integer, got '{versionSuffix}'",
                nameof(code));
        }

        var businessLine = ContractSegmentCodes.ParseBusinessLine(body.Substring(2, 1));
        var salesType = ContractSegmentCodes.ParseSalesType(body.Substring(3, 2));
        var productType = ContractSegmentCodes.ParseProductType(body.Substring(5, 2));
        var vehicleType = ContractSegmentCodes.ParseVehicleType(body.Substring(7, 3));

        var customerSegment = body.Substring(10, 2);
        if (!int.TryParse(customerSegment, out var customerShortId))
        {
            throw new ArgumentException(
                $"customer short id must be 2 digits, got '{customerSegment}'", nameof(code));
        }

        var contractForm = ContractSegmentCodes.ParseContractForm(body.Substring(12, 2));
        var contractType = ContractSegmentCodes.ParseContractType(body.Substring(14, 2));

        var productSegment = body.Substring(16, 7);
        if (!int.TryParse(productSegment, out var productId) || productId < 1)
        {
            throw new ArgumentException(
                $"product id must be 7 digits (>=1), got '{productSegment}'", nameof(code));
        }

        var paymentFrequency = ContractSegmentCodes.ParsePaymentFrequency(body.Substring(23, 3));
        var adjustmentClause = ContractSegmentCodes.ParseAdjustmentClause(body.Substring(26, 1));
        var contractKind = ContractSegmentCodes.ParseContractKind(body.Substring(27, 2));
        var serviceArea = ContractSegmentCodes.ParseServiceArea(body.Substring(29, 1));

        // Parser normalized value ile geri döner (T365 → 365 vb.). Orijinal
        // input Builder.Value ile eşleşmeyebilir; caller orijinal metni
        // saklamak isterse ayrı tutmalı.
        return Build(
            businessLine, salesType, productType, vehicleType,
            customerShortId, contractForm, contractType, productId,
            paymentFrequency, adjustmentClause, contractKind, serviceArea,
            version);
    }

    /// <summary>Aynı kontrat kodunun versiyonu bir artırılmış kopyasını döner.</summary>
    public ContractCode BumpVersion() => Build(
        BusinessLine, SalesType, ProductType, VehicleType,
        CustomerShortId, ContractForm, ContractType, ProductId,
        PaymentFrequency, AdjustmentClause, ContractKind, ServiceArea,
        Version + 1);

    public override string ToString() => Value;

    private static void ValidateCustomerShortId(int value)
    {
        if (value < 0 || value > 99)
        {
            throw new ArgumentOutOfRangeException(
                nameof(value), value, "customer short id must be 0-99 (2-digit)");
        }
    }

    private static void ValidateProductId(int value)
    {
        if (value < 1 || value > 9_999_999)
        {
            throw new ArgumentOutOfRangeException(
                nameof(value), value, "product id must be 1-9999999 (7-digit)");
        }
    }

    private static void ValidateVersion(int value)
    {
        if (value < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(value), value, "version must be >= 1");
        }
    }
}
