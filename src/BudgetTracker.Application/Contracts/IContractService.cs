namespace BudgetTracker.Application.Contracts;

public interface IContractService
{
    Task<IReadOnlyList<ContractDto>> GetAllAsync(
        int? customerId,
        int? productId,
        string? flow,
        string? status,
        CancellationToken cancellationToken);

    Task<ContractDto?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<ContractDto> CreateAsync(
        CreateContractRequest request, int actorUserId, CancellationToken cancellationToken);

    Task<ContractDto> UpdateAsync(
        int id, UpdateContractRequest request, int actorUserId, CancellationToken cancellationToken);

    Task<ContractDto> ReviseAsync(
        int id, ReviseContractRequest request, int actorUserId, CancellationToken cancellationToken);

    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken);

    /// <summary>Draft → Active geçişi (00b §3.1).</summary>
    Task<ContractDto> ActivateAsync(int id, int actorUserId, CancellationToken cancellationToken);

    /// <summary>Active/Draft → Terminated (00b §3.1).</summary>
    Task<ContractDto> TerminateAsync(
        int id, TerminateContractRequest request, int actorUserId, CancellationToken cancellationToken);

    /// <summary>Operatör önizleme — kayıt etmeden kontrat kodu üretir.</summary>
    Task<string> PreviewCodeAsync(
        CreateContractRequest request, CancellationToken cancellationToken);

    /// <summary>Parser — mevcut string → 14 segment açılımı.</summary>
    ContractCodeBreakdownDto ParseCode(string code);
}

/// <summary>Parser çıktısı; UI'da kod çözümlemesi göstermek için.</summary>
public sealed record ContractCodeBreakdownDto(
    string Value,
    string BusinessLine,
    string SalesType,
    string ProductType,
    string VehicleType,
    int CustomerShortId,
    string ContractForm,
    string ContractType,
    int ProductId,
    string PaymentFrequency,
    string AdjustmentClause,
    string ContractKind,
    string ServiceArea,
    int Version);
