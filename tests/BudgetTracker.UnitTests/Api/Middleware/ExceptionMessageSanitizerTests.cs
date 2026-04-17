using BudgetTracker.Api.Middleware;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Api.Middleware;

public sealed class ExceptionMessageSanitizerTests
{
    [Theory]
    [InlineData("Host=db.internal;Port=5432;Database=finops;Username=ops;Password=s3cret", 0)]
    [InlineData("Connection refused (Host=db.internal)", 0)]
    [InlineData("User ID=foo;Password=bar", 0)]
    public void Sanitize_MasksConnectionStringFragments(string input, int _)
    {
        var result = ExceptionMessageSanitizer.Sanitize(input);

        result.Should().Contain("[REDACTED]");
        result.Should().NotContain("s3cret");
        result.Should().NotContain("db.internal");
        result.Should().NotContain("ops");
    }

    [Theory]
    [InlineData("/etc/secrets/openiddict-signing.pfx")]
    [InlineData("/var/lib/postgres/data")]
    [InlineData("/home/railway/app/secret.conf")]
    [InlineData("/tmp/upload-123.xlsx")]
    public void Sanitize_MasksAbsoluteUnixPaths(string input)
    {
        ExceptionMessageSanitizer.Sanitize(input).Should().Be("[REDACTED]");
    }

    [Theory]
    [InlineData(@"C:\Users\alice\AppData\Local\secret.pfx")]
    [InlineData(@"D:\railway\mount\cert.pfx")]
    public void Sanitize_MasksWindowsPaths(string input)
    {
        // Both masks may trigger on the .pfx ending; we just need the final
        // output not to contain any original path segment.
        var result = ExceptionMessageSanitizer.Sanitize(input);
        result.Should().Contain("[REDACTED]");
        result.Should().NotContain("alice");
        result.Should().NotContain("railway");
    }

    [Theory]
    [InlineData("openiddict-encryption.pfx")]
    [InlineData("some_key_file.key")]
    [InlineData("certificate not found at cert.pfx")]
    public void Sanitize_MasksCertificateFileReferences(string input)
    {
        var result = ExceptionMessageSanitizer.Sanitize(input);
        result.Should().Contain("[REDACTED]");
        result.Should().NotContain(".pfx");
        result.Should().NotContain(".key");
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Sanitize_WithEmptyInput_ReturnsEmpty(string? input)
    {
        ExceptionMessageSanitizer.Sanitize(input).Should().Be(string.Empty);
    }

    [Fact]
    public void Sanitize_OrdinaryMessage_UnchangedExceptForWhiteList()
    {
        var input = "Budget version 42 not found";
        ExceptionMessageSanitizer.Sanitize(input).Should().Be(input);
    }

    [Fact]
    public void Sanitize_CombinedSensitiveAndSafe_MasksOnlySensitive()
    {
        var input = "Failed to load /etc/secrets/cert.pfx for tenant 42";
        var result = ExceptionMessageSanitizer.Sanitize(input);

        result.Should().NotContain("/etc/");
        result.Should().NotContain(".pfx");
        result.Should().Contain("tenant 42", "non-sensitive context must survive");
    }
}
