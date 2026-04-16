using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BudgetTracker.Api.Filters;

public sealed class FluentValidationFilter : IAsyncActionFilter
{
    private readonly IServiceProvider _serviceProvider;

    public FluentValidationFilter(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            var argumentType = argument.GetType();
            var validatorType = typeof(IValidator<>).MakeGenericType(argumentType);
            var validator = _serviceProvider.GetService(validatorType) as IValidator;

            if (validator is null) continue;

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);

            if (!result.IsValid)
            {
                var problemDetails = new ValidationProblemDetails
                {
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Title = "Validation Failed",
                    Instance = context.HttpContext.Request.Path
                };

                foreach (var error in result.Errors)
                {
                    if (!problemDetails.Errors.ContainsKey(error.PropertyName))
                    {
                        problemDetails.Errors[error.PropertyName] = [];
                    }

                    problemDetails.Errors[error.PropertyName] =
                        [..problemDetails.Errors[error.PropertyName], error.ErrorMessage];
                }

                context.Result = new ObjectResult(problemDetails)
                {
                    StatusCode = StatusCodes.Status422UnprocessableEntity
                };
                return;
            }
        }

        await next();
    }
}
