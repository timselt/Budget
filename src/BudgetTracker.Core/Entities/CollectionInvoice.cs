using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class CollectionInvoice : TenantEntity
{
    public int ImportPeriodId { get; private set; }
    public ImportPeriod ImportPeriod { get; private set; } = null!;
    public int CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public string InvoiceNo { get; private set; } = string.Empty;
    public DateTime TransactionDate { get; private set; }
    public DateTime DueDate { get; private set; }
    public int DaysDiff { get; private set; }
    public decimal Amount { get; private set; }
    public string? Note { get; private set; }
    public InvoiceCollectionStatus Status { get; private set; }

    private CollectionInvoice() { }

    public static CollectionInvoice Create(
        int companyId,
        int importPeriodId,
        int customerId,
        string invoiceNo,
        DateTime transactionDate,
        DateTime dueDate,
        int daysDiff,
        decimal amount,
        InvoiceCollectionStatus status,
        int createdByUserId,
        DateTimeOffset createdAt,
        string? note = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (importPeriodId <= 0) throw new ArgumentOutOfRangeException(nameof(importPeriodId));
        if (customerId <= 0) throw new ArgumentOutOfRangeException(nameof(customerId));
        ArgumentException.ThrowIfNullOrWhiteSpace(invoiceNo);
        if (invoiceNo.Length > 50) throw new ArgumentException("invoiceNo max 50 characters", nameof(invoiceNo));

        return new CollectionInvoice
        {
            CompanyId = companyId,
            ImportPeriodId = importPeriodId,
            CustomerId = customerId,
            InvoiceNo = invoiceNo,
            TransactionDate = transactionDate,
            DueDate = dueDate,
            DaysDiff = daysDiff,
            Amount = amount,
            Note = note,
            Status = status,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void UpdateStatus(InvoiceCollectionStatus status, DateTimeOffset updatedAt, int actorUserId)
    {
        Status = status;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }
}
