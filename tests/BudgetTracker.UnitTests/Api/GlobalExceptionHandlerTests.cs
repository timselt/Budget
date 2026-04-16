using System.Text.Json;
using BudgetTracker.Api.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace BudgetTracker.UnitTests.Api;

public sealed class GlobalExceptionHandlerTests
{
    private readonly GlobalExceptionHandler _sut = new(NullLogger<GlobalExceptionHandler>.Instance);

    [Fact]
    public async Task ArgumentException_Returns422()
    {
        var context = CreateHttpContext();
        var ex = new ArgumentException("Invalid month value");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status422UnprocessableEntity);
    }

    [Fact]
    public async Task InvalidOperationException_WithNotFound_Returns404()
    {
        var context = CreateHttpContext();
        var ex = new InvalidOperationException("Budget entry 99 not found");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task InvalidOperationException_WithCannotBeEdited_Returns409()
    {
        var context = CreateHttpContext();
        var ex = new InvalidOperationException("Budget version 1 is Active and cannot be edited");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status409Conflict);
    }

    [Fact]
    public async Task InvalidOperationException_Generic_Returns400()
    {
        var context = CreateHttpContext();
        var ex = new InvalidOperationException("Something went wrong");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task UnhandledException_Returns500_WithGenericMessage()
    {
        var context = CreateHttpContext();
        var ex = new NullReferenceException("oops");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await JsonSerializer.DeserializeAsync<ProblemDetails>(context.Response.Body);
        body!.Detail.Should().Be("An unexpected error occurred.");
    }

    [Fact]
    public async Task UnauthorizedAccessException_Returns403()
    {
        var context = CreateHttpContext();
        var ex = new UnauthorizedAccessException("No access");

        var handled = await _sut.TryHandleAsync(context, ex, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    private static HttpContext CreateHttpContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.Request.Path = "/api/v1/test";
        return context;
    }
}
