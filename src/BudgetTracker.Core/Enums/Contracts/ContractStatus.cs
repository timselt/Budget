namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat yaşam döngüsü durumu (Mutabakat modülü önkoşul 00b §2.1).
/// <list type="bullet">
///   <item><description><see cref="Draft"/> — taslak; aktif değil, PriceBook onayı öncesi.</description></item>
///   <item><description><see cref="Active"/> — yürürlükte; lookup bu durumdakileri döner.</description></item>
///   <item><description><see cref="Expired"/> — <c>EffectiveTo</c> geçti; sistem otomatik.</description></item>
///   <item><description><see cref="Terminated"/> — manuel sonlandırma; sebep <c>Notes</c>.</description></item>
/// </list>
/// </summary>
public enum ContractStatus
{
    Draft = 0,
    Active = 1,
    Expired = 2,
    Terminated = 3
}
