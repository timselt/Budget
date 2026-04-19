using BudgetTracker.Application.Authorization;
using BudgetTracker.Application.Calculations;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetTracker.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<IKpiCalculationEngine>(ServiceLifetime.Scoped);
        services.AddScoped<IKpiCalculationEngine, KpiCalculationEngine>();
        services.AddSingleton<ISegregationOfDutiesGuard, SegregationOfDutiesGuard>();

        return services;
    }
}
