using System.Security.Claims;
using BudgetTracker.Core.Common;
using BudgetTracker.Infrastructure.Observability;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using NSubstitute;
using Serilog;
using Serilog.Core;
using Serilog.Events;

namespace BudgetTracker.UnitTests.Infrastructure.Observability;

public sealed class BudgetTrackerLogEnricherTests
{
    [Fact]
    public void Enrich_WhenHttpContextNull_AddsJobContextProperty_AndDoesNotThrow()
    {
        // Simulates a Hangfire worker thread: IHttpContextAccessor exists but its
        // HttpContext property is null. The enricher must not crash and must label
        // the log event so Seq filters can find background-job lines.
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns((HttpContext?)null);
        var tenantContext = Substitute.For<ITenantContext>();
        tenantContext.CurrentCompanyId.Returns((int?)null);

        var captured = CaptureOne(new BudgetTrackerLogEnricher(accessor, tenantContext),
            logger => logger.Information("ping"));

        Scalar(captured, "job_context").Should().Be("hangfire");
        captured.Properties.Should().NotContainKey("request_id");
        captured.Properties.Should().NotContainKey("user_id");
    }

    [Fact]
    public void Enrich_WhenHttpContextNull_WithAmbientTenant_AddsTenantIdAlongsideJobContext()
    {
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns((HttpContext?)null);
        var tenantContext = Substitute.For<ITenantContext>();
        tenantContext.CurrentCompanyId.Returns(7);

        var captured = CaptureOne(new BudgetTrackerLogEnricher(accessor, tenantContext),
            logger => logger.Information("ping"));

        Scalar(captured, "job_context").Should().Be("hangfire");
        Scalar(captured, "tenant_id").Should().Be(7);
    }

    [Fact]
    public void Enrich_WhenHttpContextPresent_AddsTenantUserAndRequestId()
    {
        var httpContext = new DefaultHttpContext { TraceIdentifier = "req-42" };
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "99"),
        }, authenticationType: "test"));

        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        var tenantContext = Substitute.For<ITenantContext>();
        tenantContext.CurrentCompanyId.Returns(1);

        var captured = CaptureOne(new BudgetTrackerLogEnricher(accessor, tenantContext),
            logger => logger.Information("ping"));

        Scalar(captured, "request_id").Should().Be("req-42");
        Scalar(captured, "tenant_id").Should().Be(1);
        Scalar(captured, "user_id").Should().Be("99");
        captured.Properties.Should().NotContainKey("job_context");
    }

    [Fact]
    public void Enrich_WhenNameIdentifierIsEmail_RedactsUserIdToSentinel()
    {
        // Defensive guard: if a custom OpenIddict claim mapping ever placed an email
        // under NameIdentifier, shipping it to Seq as `user_id` would bypass the
        // PiiMaskingEnricher (which only matches properties named Email/email).
        var httpContext = new DefaultHttpContext { TraceIdentifier = "req-99" };
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "timur@turassist.com"),
        }, authenticationType: "test"));

        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);

        var captured = CaptureOne(new BudgetTrackerLogEnricher(accessor, tenantContext: null),
            logger => logger.Information("ping"));

        Scalar(captured, "user_id").Should().Be("***");
    }

    [Fact]
    public void Enrich_WhenAccessorNull_DoesNotThrow_AndTreatsAsBackgroundJob()
    {
        // Non-web host (CLI seeder, unit tests): the accessor itself may be absent.
        var captured = CaptureOne(new BudgetTrackerLogEnricher(httpContextAccessor: null, tenantContext: null),
            logger => logger.Information("ping"));

        Scalar(captured, "job_context").Should().Be("hangfire");
    }

    private static LogEvent CaptureOne(ILogEventEnricher enricher, Action<ILogger> emit)
    {
        var sink = new ListSink();
        var logger = new LoggerConfiguration()
            .Enrich.With(enricher)
            .WriteTo.Sink(sink)
            .CreateLogger();
        try
        {
            emit(logger);
        }
        finally
        {
            logger.Dispose();
        }
        sink.Events.Should().ContainSingle();
        return sink.Events[0];
    }

    private static object? Scalar(LogEvent ev, string name) =>
        ev.Properties.TryGetValue(name, out var v) && v is ScalarValue s ? s.Value : null;

    private sealed class ListSink : ILogEventSink
    {
        public List<LogEvent> Events { get; } = new();
        public void Emit(LogEvent logEvent) => Events.Add(logEvent);
    }
}
