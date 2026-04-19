namespace BudgetTracker.Application.Customers;

/// <summary>
/// Mutabakat import parser'ının /customers/lookup?externalRef=... çağrısında
/// aldığı hafif müşteri kimlik cevabı. 404 = eşleşme yok; 200 = eşleşti.
/// </summary>
public sealed record CustomerLookupDto(
    int Id,
    string Code,
    string Name,
    string ExternalCustomerRef,
    string ExternalSourceSystem,
    DateTimeOffset? ExternalRefVerifiedAt);
