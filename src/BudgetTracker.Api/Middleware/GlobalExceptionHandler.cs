using BudgetTracker.Application.Imports;
using BudgetTracker.Application.Reports;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BudgetTracker.Api.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title) = exception switch
        {
            ImportFileTooLargeException => (StatusCodes.Status422UnprocessableEntity, "Import Too Large"),
            ImportConcurrencyConflictException => (StatusCodes.Status409Conflict, "Import In Progress"),
            ArgumentException => (StatusCodes.Status422UnprocessableEntity, "Validation Error"),
            InvalidOperationException e
                when e.Message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                && !e.Message.Contains("claim", StringComparison.OrdinalIgnoreCase)
                => (StatusCodes.Status404NotFound, "Not Found"),
            InvalidOperationException e when e.Message.Contains("cannot be edited", StringComparison.OrdinalIgnoreCase)
                => (StatusCodes.Status409Conflict, "Conflict"),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "Bad Request"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden"),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception,
                "Unhandled exception: {SafeMessage} path={Path} traceId={TraceId}",
                ExceptionMessageSanitizer.Sanitize(exception.Message),
                httpContext.Request.Path,
                httpContext.TraceIdentifier);
        }
        else
        {
            _logger.LogWarning(exception,
                "Handled exception: {StatusCode} path={Path} traceId={TraceId}",
                statusCode, httpContext.Request.Path, httpContext.TraceIdentifier);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = statusCode == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred."
                : ExceptionMessageSanitizer.Sanitize(exception.Message),
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
