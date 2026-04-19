namespace BudgetTracker.Core.Enums;

// ADR-0015: onay akışı 2 aşamaya indirildi. Eski Submitted, DeptApproved,
// FinanceApproved, CfoApproved değerleri kaldırıldı; migration eski verileri
// yeni enum değerlerine eşler.
public enum BudgetVersionStatus
{
    Draft = 0,
    PendingFinance = 1,
    PendingCfo = 2,
    Active = 3,
    Rejected = 4,
    Archived = 5,
}
