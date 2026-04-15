using BudgetTracker.Core.Common;

namespace BudgetTracker.Core.Entities;

public sealed class Company : BaseEntity
{
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string BaseCurrencyCode { get; private set; } = default!;

    private Company() { }

    public static Company Create(string code, string name, string baseCurrencyCode, DateTimeOffset createdAt, int? createdByUserId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(baseCurrencyCode);

        return new Company
        {
            Code = code,
            Name = name,
            BaseCurrencyCode = baseCurrencyCode,
            CreatedAt = createdAt,
            CreatedByUserId = createdByUserId
        };
    }
}
