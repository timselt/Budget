using BudgetTracker.Infrastructure.Observability;
using FluentAssertions;
using Serilog;
using Serilog.Core;
using Serilog.Events;

namespace BudgetTracker.UnitTests.Infrastructure.Observability;

public sealed class PiiMaskingEnricherTests
{
    [Theory]
    [InlineData("timur@turassist.com", "t***@turassist.com")]
    [InlineData("admin@tag.local", "a***@tag.local")]
    [InlineData("t@t.co", "t***@t.co")]
    public void Enrich_MasksEmailProperty_PreservingFirstCharAndDomain(string input, string expected)
    {
        var captured = CaptureOne(logger =>
            logger.Information("user {Email} signed in", input));

        Scalar(captured, "Email").Should().Be(expected);
    }

    [Fact]
    public void Enrich_MasksLowercaseEmailProperty()
    {
        var captured = CaptureOne(logger =>
            logger.Information("event user {email}", "admin@tag.local"));

        Scalar(captured, "email").Should().Be("a***@tag.local");
    }

    [Theory]
    [InlineData("192.168.1.42", "192.168.1.***")]
    [InlineData("10.0.0.7", "10.0.0.***")]
    public void Enrich_MasksIpv4LastOctet(string input, string expected)
    {
        var captured = CaptureOne(logger =>
            logger.Information("request from {IpAddress}", input));

        Scalar(captured, "IpAddress").Should().Be(expected);
    }

    [Fact]
    public void Enrich_MasksSnakeCaseIpProperty()
    {
        var captured = CaptureOne(logger =>
            logger.Information("request from {ip_address}", "10.0.0.7"));

        Scalar(captured, "ip_address").Should().Be("10.0.0.***");
    }

    [Fact]
    public void Enrich_MasksIpv6LastGroup()
    {
        var captured = CaptureOne(logger =>
            logger.Information("ipv6 {IpAddress}", "fe80::1:2:3:4"));

        Scalar(captured, "IpAddress").Should().Be("fe80::1:2:3:***");
    }

    [Fact]
    public void Enrich_DoesNotTouchUnrelatedProperties()
    {
        var captured = CaptureOne(logger =>
            logger.Information("payload {Message}", "hello"));

        Scalar(captured, "Message").Should().Be("hello");
    }

    [Fact]
    public void Enrich_IgnoresNonStringEmailValues()
    {
        var captured = CaptureOne(logger =>
            logger.Information("weird {Email}", 42));

        // Non-string values are left alone rather than turned into "***".
        Scalar(captured, "Email").Should().Be(42);
    }

    [Theory]
    [InlineData("t@t.co", "t***@t.co")]
    [InlineData("@nohost", "***")]      // malformed — no local part
    [InlineData("noat", "***")]         // no @ at all
    public void MaskEmail_EdgeCases(string input, string expected)
    {
        PiiMaskingEnricher.MaskEmail(input).Should().Be(expected);
    }

    [Theory]
    [InlineData("1.2.3.4", "1.2.3.***")]
    [InlineData("not-an-ip", "***")]
    [InlineData(".", "***")]
    public void MaskIp_EdgeCases(string input, string expected)
    {
        PiiMaskingEnricher.MaskIp(input).Should().Be(expected);
    }

    private static LogEvent CaptureOne(Action<ILogger> emit)
    {
        var sink = new ListSink();
        var logger = new LoggerConfiguration()
            .Enrich.With(new PiiMaskingEnricher())
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
