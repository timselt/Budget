using System.Text.RegularExpressions;

namespace BudgetTracker.Api.Middleware;

/// <summary>
/// Closes the F2 security-reviewer carry-over (ADR-0008 §2.5). Strips
/// connection-string fragments, absolute filesystem paths, and certificate
/// file references from exception messages before they reach the HTTP
/// response body or the structured log.
/// </summary>
public static partial class ExceptionMessageSanitizer
{
    private const string Redaction = "[REDACTED]";

    // Matches Npgsql / ADO.NET connection-string key=value segments. Intentionally
    // greedy up to ; or whitespace so "Password=abc;Host=x" becomes two separate
    // masks rather than one long span.
    [GeneratedRegex(@"(?i)\b(Host|Server|Password|Username|User ID|Port|Database)\s*=\s*[^;\s]+")]
    private static partial Regex ConnectionStringFragment();

    // Absolute POSIX filesystem paths in operational directories that operators
    // don't want in logs (release secrets, volume mounts, temp dirs).
    [GeneratedRegex(@"/(etc|var|home|usr|opt|tmp|root)(/[^\s""']+)+")]
    private static partial Regex AbsoluteUnixPath();

    // Windows drive-letter paths — less common on Railway but cheap to cover.
    [GeneratedRegex(@"(?i)[A-Z]:\\[^\s""']+")]
    private static partial Regex AbsoluteWindowsPath();

    // Anything ending in .pfx or .key regardless of directory — OpenIddict cert
    // references often leak as "certificate not found at X.pfx" in messages that
    // the unix-path mask would otherwise miss.
    [GeneratedRegex(@"[^\s""']+\.(pfx|key)\b", RegexOptions.IgnoreCase)]
    private static partial Regex CertificateFileReference();

    public static string Sanitize(string? message)
    {
        if (string.IsNullOrEmpty(message)) return string.Empty;

        var result = ConnectionStringFragment().Replace(message, Redaction);
        result = AbsoluteUnixPath().Replace(result, Redaction);
        result = AbsoluteWindowsPath().Replace(result, Redaction);
        result = CertificateFileReference().Replace(result, Redaction);
        return result;
    }
}
