using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Mutabakat dosyası (Faz 1 spec §3.4) — bir müşteri + dönem + flow
/// üçlüsü için tektir. <b>Sprint 1 iskelet:</b> tablo + base alanlar
/// oluşturulur; Case auto-create ve state machine enforcement Sprint 2'de
/// devreye girer. Bu sınıfın factory + state mutation metodları Sprint 2'de
/// genişletilecek.
/// </summary>
public sealed class ReconciliationCase : TenantEntity
{
    public ReconciliationFlow Flow { get; private set; }
    public string PeriodCode { get; private set; } = string.Empty;
    public int CustomerId { get; private set; }
    public int? ContractId { get; private set; }
    public ReconciliationCaseStatus Status { get; private set; }
    public int OwnerUserId { get; private set; }
    public DateTimeOffset OpenedAt { get; private set; }
    public DateTimeOffset? SentToCustomerAt { get; private set; }
    public DateTimeOffset? CustomerResponseAt { get; private set; }
    public DateTimeOffset? SentToAccountingAt { get; private set; }

    /// <summary>Line toplamı; trigger veya servis tarafından güncellenir.</summary>
    public decimal TotalAmount { get; private set; }

    public string CurrencyCode { get; private set; } = "TRY";
    public string? Notes { get; private set; }

    private ReconciliationCase() { }

    /// <summary>Sprint 1 iskelet — gerçek factory Sprint 2'de Case auto-create
    /// algoritmasıyla birlikte gelir. Şimdilik integration test fixture'ları için.</summary>
    public static ReconciliationCase CreateDraft(
        int companyId,
        ReconciliationFlow flow,
        string periodCode,
        int customerId,
        int ownerUserId,
        DateTimeOffset openedAt,
        int? contractId = null,
        string currencyCode = "TRY")
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        if (ownerUserId <= 0) throw new ArgumentOutOfRangeException(nameof(ownerUserId));
        if (string.IsNullOrWhiteSpace(periodCode) || periodCode.Length != 7)
            throw new ArgumentException("period_code YYYY-MM", nameof(periodCode));

        var c = new ReconciliationCase
        {
            Flow = flow,
            PeriodCode = periodCode,
            CustomerId = customerId,
            ContractId = contractId,
            Status = ReconciliationCaseStatus.Draft,
            OwnerUserId = ownerUserId,
            OpenedAt = openedAt,
            TotalAmount = 0m,
            CurrencyCode = currencyCode,
            CreatedAt = openedAt,
            CreatedByUserId = ownerUserId,
        };
        c.CompanyId = companyId;
        return c;
    }

    /// <summary>
    /// Sprint 2 Task 7/12 — Case sahipliği atama + Draft ise UnderControl'e geçir.
    /// Idempotent: mevcut owner ile aynı user atanırsa durum değişmez.
    /// </summary>
    public void AssignOwner(int newOwnerUserId, DateTimeOffset updatedAt)
    {
        if (newOwnerUserId <= 0) throw new ArgumentOutOfRangeException(nameof(newOwnerUserId));
        OwnerUserId = newOwnerUserId;
        UpdatedAt = updatedAt;
        UpdatedByUserId = newOwnerUserId;

        // Task 12 state machine: Draft → UnderControl yalnızca owner atandığında.
        if (Status == ReconciliationCaseStatus.Draft)
        {
            Status = ReconciliationCaseStatus.UnderControl;
        }
    }

    /// <summary>
    /// Sprint 2 Task 12 — Case UnderControl iken tüm line'lar Ready ise PricingMatched.
    /// <paramref name="allLinesReady"/> validasyonu çağrıcıda yapılır (domain Line
    /// koleksiyonunu tutmaz; servis Line query'sini geçirir).
    /// </summary>
    public void MarkPricingMatched(bool allLinesReady, DateTimeOffset updatedAt)
    {
        if (Status != ReconciliationCaseStatus.UnderControl)
        {
            throw new InvalidCaseTransitionException(Status, ReconciliationCaseStatus.PricingMatched,
                "only UnderControl case can transition to PricingMatched");
        }
        if (!allLinesReady)
        {
            throw new InvalidCaseTransitionException(Status, ReconciliationCaseStatus.PricingMatched,
                "all lines must be Ready before PricingMatched transition");
        }
        Status = ReconciliationCaseStatus.PricingMatched;
        UpdatedAt = updatedAt;
    }

    /// <summary>
    /// Sprint 2 Task 7 — Case TotalAmount'u Line toplamından recompute eder.
    /// Line update/add/remove sonrası servis çağırır.
    /// </summary>
    public void RecomputeTotalAmount(decimal newTotal, DateTimeOffset updatedAt)
    {
        TotalAmount = decimal.Round(newTotal, 2, MidpointRounding.ToEven);
        UpdatedAt = updatedAt;
    }
}

/// <summary>
/// Sprint 2 Task 12 — Case state machine geçişi reddedildi.
/// Controller katmanı 409 Conflict ile yanıtlar.
/// </summary>
public sealed class InvalidCaseTransitionException : InvalidOperationException
{
    public ReconciliationCaseStatus From { get; }
    public ReconciliationCaseStatus To { get; }

    public InvalidCaseTransitionException(
        ReconciliationCaseStatus from,
        ReconciliationCaseStatus to,
        string reason)
        : base($"cannot transition {from} → {to}: {reason}")
    {
        From = from;
        To = to;
    }
}
