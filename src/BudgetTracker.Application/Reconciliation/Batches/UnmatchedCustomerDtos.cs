namespace BudgetTracker.Application.Reconciliation.Batches;

/// <summary>
/// Sprint 2 Task 8 — UnmatchedCustomers bucket. Bir batch içindeki Ok
/// SourceRow'lar arasında Customer.ExternalCustomerRef eşleşmeyen unique
/// kaynak kodları + satır sayısı + örnek satırlar.
/// </summary>
public sealed record UnmatchedCustomerRefDto(
    string ExternalCustomerRef,
    int RowCount,
    IReadOnlyList<string> SampleDocumentRefs);

/// <summary>
/// Sprint 2 Task 8 — bir unmatched external_customer_ref'i mevcut
/// bir Customer'a bağlama isteği. Servis:
/// 1) Customer.LinkExternalRef çağırır (00a endpoint tekrar kullanılır)
/// 2) CaseAutoCreator'ı idempotent re-invoke eder (yeni Case üretir)
/// </summary>
public sealed record LinkUnmatchedCustomerRequest(int CustomerId);

public sealed record LinkUnmatchedCustomerResult(
    int CustomerId,
    string ExternalCustomerRef,
    int NewCasesCreated,
    int NewLinesCreated);
