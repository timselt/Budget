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
        // Defensive wrapper: ADR-0007 §2.3 requires the enricher never to throw.
        // Any failure here goes to SelfLog instead of aborting the log event —
        // PII masking is important but it must not silently drop lines on a bug.
        try
        {
            foreach (var name in EmailPropertyNames)
            {
                MaskIfPresent(logEvent, propertyFactory, name, MaskEmail);
            }

            foreach (var name in IpPropertyNames)
            {
                MaskIfPresent(logEvent, propertyFactory, name, MaskIp);
            }
        }
        catch (Exception ex)
        {
            Serilog.Debugging.SelfLog.WriteLine("PiiMaskingEnricher failed: {0}", ex);
        }
    }

    private static void MaskIfPresent(
        LogEvent logEvent,
        ILogEventPropertyFactory factory,
        string name,
        Func<string, string> mask)
    {
        if (!logEvent.Properties.TryGetValue(name, out var prop)) return;

        // If the property is present but not a plain string scalar (e.g. the caller
        // passed an object, Guid, or destructured value under a sensitive name) we
        // cannot safely mask it; replace it with a fixed sentinel rather than let
        // the unmasked value ship to Seq. This closes the "type-bypass" vector.
        if (prop is not ScalarValue scalar || scalar.Value is not string str)
        {
            logEvent.AddOrUpdateProperty(factory.CreateProperty(name, "***"));
            return;
        }

        if (string.IsNullOrEmpty(str)) return;

        logEvent.AddOrUpdateProperty(factory.CreateProperty(name, mask(str)));
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
