using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums;

namespace BudgetTracker.Core.Entities;

public sealed class ImportPeriod : TenantEntity
{
    public int SegmentId { get; private set; }
    public Segment Segment { get; private set; } = null!;
    public DateTime ImportDate { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string? PeriodLabel { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal OverdueAmount { get; private set; }
    public decimal PendingAmount { get; private set; }
    public ImportPeriodStatus Status { get; private set; }

    private readonly List<CollectionInvoice> _invoices = [];
    public IReadOnlyCollection<CollectionInvoice> Invoices => _invoices.AsReadOnly();

    private ImportPeriod() { }

    public static ImportPeriod Create(
        int companyId,
        int segmentId,
        DateTime importDate,
        string fileName,
        int createdByUserId,
        DateTimeOffset createdAt,
        string? periodLabel = null)
    {
        if (companyId <= 0) throw new ArgumentOutOfRangeException(nameof(companyId));
        if (segmentId <= 0) throw new ArgumentOutOfRangeException(nameof(segmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        if (fileName.Length > 500) throw new ArgumentException("fileName max 500 characters", nameof(fileName));

        return new ImportPeriod
        {
            CompanyId = companyId,
            SegmentId = segmentId,
            ImportDate = importDate,
            FileName = fileName,
            PeriodLabel = periodLabel,
            TotalAmount = 0m,
            OverdueAmount = 0m,
            PendingAmount = 0m,
            Status = ImportPeriodStatus.Processing,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void MarkCompleted(decimal totalAmount, decimal overdueAmount, decimal pendingAmount, DateTimeOffset updatedAt, int actorUserId)
    {
        TotalAmount = totalAmount;
        OverdueAmount = overdueAmount;
        PendingAmount = pendingAmount;
        Status = ImportPeriodStatus.Completed;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    public void MarkFailed(DateTimeOffset updatedAt, int actorUserId)
    {
        Status = ImportPeriodStatus.Failed;
        UpdatedAt = updatedAt;
        UpdatedByUserId = actorUserId;
    }

    public void AddInvoice(CollectionInvoice invoice)
    {
        _invoices.Add(invoice);
    }
}
