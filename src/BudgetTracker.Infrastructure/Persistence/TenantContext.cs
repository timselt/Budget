using BudgetTracker.Core.Common;

namespace BudgetTracker.Infrastructure.Persistence;

public sealed class TenantContext : ITenantContext
{
    private static readonly AsyncLocal<TenantState> CurrentState = new();

    public int? CurrentCompanyId => CurrentState.Value?.CompanyId;
    public bool BypassFilter => CurrentState.Value?.Bypass ?? false;

    public IDisposable BeginScope(int companyId)
    {
        var previous = CurrentState.Value;
        CurrentState.Value = new TenantState(companyId, false);
        return new Scope(previous);
    }

    public IDisposable BeginBypassScope()
    {
        var previous = CurrentState.Value;
        CurrentState.Value = new TenantState(null, true);
        return new Scope(previous);
    }

    private sealed record TenantState(int? CompanyId, bool Bypass);

    private sealed class Scope : IDisposable
    {
        private readonly TenantState? _previous;
        private bool _disposed;

        public Scope(TenantState? previous) => _previous = previous;

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            CurrentState.Value = _previous!;
        }
    }
}
