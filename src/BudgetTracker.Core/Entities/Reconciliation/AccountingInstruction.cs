using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Mutabakat kapanıp muhasebeye aktarılacak kayıt (Faz 1 spec §3.7).
/// <b>Sprint 1 iskelet:</b> tablo oluşur; export pipeline Sprint 4'te
/// (ExcelPackage / Csv / ErpApiV1) aktive edilir.
/// </summary>
public sealed class AccountingInstruction : TenantEntity
{
    public int CaseId { get; private set; }
    public int CustomerId { get; private set; }
    public string PeriodCode { get; private set; } = string.Empty;
    public ReconciliationFlow Flow { get; private set; }

    /// <summary>jsonb — ürün/adet/birim fiyat/toplam listesi (snapshot).</summary>
    public string LinesSummary { get; private set; } = "[]";

    public decimal TotalAmount { get; private set; }
    public string CurrencyCode { get; private set; } = "TRY";
    public AccountingInstructionStatus Status { get; private set; }

    public DateTimeOffset? ExportedAt { get; private set; }
    public AccountingInstructionExportFormat? ExportedFormat { get; private set; }

    /// <summary>Muhasebenin verdiği referans (ERP fatura no vb.).</summary>
    public string? ExternalRef { get; private set; }

    private AccountingInstruction() { }

    /// <summary>Sprint 4 factory — Sprint 1'de yalnızca tablo iskeleti için.</summary>
    public static AccountingInstruction CreateReady(
        int companyId,
        int caseId,
        int customerId,
        string periodCode,
        ReconciliationFlow flow,
        string linesSummary,
        decimal totalAmount,
        string currencyCode,
        DateTimeOffset createdAt,
        int createdByUserId)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (caseId <= 0) throw new ArgumentOutOfRangeException(nameof(caseId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        if (totalAmount < 0) throw new ArgumentOutOfRangeException(nameof(totalAmount));

        var i = new AccountingInstruction
        {
            CaseId = caseId,
            CustomerId = customerId,
            PeriodCode = periodCode,
            Flow = flow,
            LinesSummary = linesSummary,
            TotalAmount = totalAmount,
            CurrencyCode = currencyCode,
            Status = AccountingInstructionStatus.Ready,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId,
        };
        i.CompanyId = companyId;
        return i;
    }
}
