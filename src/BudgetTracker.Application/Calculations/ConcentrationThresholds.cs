namespace BudgetTracker.Application.Calculations;

/// <summary>
/// Customer concentration alert thresholds (2026-04-17 muhasebe seansı kararı —
/// CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #4 kapanışı).
///
/// Applied on the dashboard + variance panels: when any single customer's
/// revenue share exceeds <see cref="WarningShare"/> the UI renders an amber
/// chip; above <see cref="CriticalShare"/> it renders red + logs a
/// <c>CUSTOMER_CONCENTRATION_CRITICAL</c> audit event.
///
/// The HHI index (<see cref="ConcentrationResult.Hhi"/>) has no hard threshold
/// today — the accounting team preferred per-customer percentages because
/// they match the Excel heuristic the team already eye-balls. HHI stays as
/// an advisory number on the dashboard.
/// </summary>
public static class ConcentrationThresholds
{
    /// <summary>Single-customer revenue share that raises a UI warning chip.</summary>
    public const decimal WarningShare = 0.30m;

    /// <summary>Single-customer revenue share that raises a UI critical chip + audit event.</summary>
    public const decimal CriticalShare = 0.50m;
}
