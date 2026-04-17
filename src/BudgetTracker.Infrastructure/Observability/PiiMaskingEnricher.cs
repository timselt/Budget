using Serilog.Core;
using Serilog.Events;

namespace BudgetTracker.Infrastructure.Observability;

/// <summary>
/// Masks PII fields in structured log events before they leave the process
/// (ADR-0007 §2.4). Scope: <b>log output only</b>. The <c>audit_logs</c> table
/// keeps raw values because the audit trail is the authoritative record for
/// security-incident analysis (KVKK legitimate-interest basis — to be
/// documented in <c>docs/kvkk-uyum.md</c> at F6).
/// </summary>
/// <remarks>
/// Recognised property names (case-sensitive, matching the convention used by
/// the rest of the codebase):
/// <list type="bullet">
///   <item><c>Email</c>, <c>email</c> — masked as <c>u***@domain.tld</c></item>
///   <item><c>IpAddress</c>, <c>ip_address</c> — last octet stripped (<c>1.2.3.***</c>)</item>
/// </list>
/// </remarks>
public sealed class PiiMaskingEnricher : ILogEventEnricher
{
    private static readonly string[] EmailPropertyNames = ["Email", "email"];
    private static readonly string[] IpPropertyNames = ["IpAddress", "ip_address", "ClientIp", "client_ip"];

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        foreach (var name in EmailPropertyNames)
        {
            if (TryReadScalarString(logEvent, name, out var value))
            {
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(name, MaskEmail(value)));
            }
        }

        foreach (var name in IpPropertyNames)
        {
            if (TryReadScalarString(logEvent, name, out var value))
            {
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(name, MaskIp(value)));
            }
        }
    }

    private static bool TryReadScalarString(LogEvent logEvent, string name, out string value)
    {
        if (logEvent.Properties.TryGetValue(name, out var prop)
            && prop is ScalarValue scalar
            && scalar.Value is string str
            && !string.IsNullOrEmpty(str))
        {
            value = str;
            return true;
        }

        value = string.Empty;
        return false;
    }

    internal static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0) return "***";
        var local = email[..at];
        var domain = email[(at + 1)..];
        var keep = local.Length == 1 ? local : local[..1];
        return $"{keep}***@{domain}";
    }

    internal static string MaskIp(string ip)
    {
        // IPv4: strip last octet. IPv6: strip last group after the final colon.
        if (ip.Contains('.'))
        {
            var dot = ip.LastIndexOf('.');
            return dot > 0 ? ip[..(dot + 1)] + "***" : "***";
        }
        if (ip.Contains(':'))
        {
            var colon = ip.LastIndexOf(':');
            return colon > 0 ? ip[..(colon + 1)] + "***" : "***";
        }
        return "***";
    }
}
