namespace BudgetTracker.Api.Configuration;

/// <summary>
/// PFX paths and passwords for OpenIddict's encryption and signing certificates.
/// Required in production; development uses ephemeral in-memory certs.
/// Configure via Railway secret store (mounted file paths + env-var passwords).
/// </summary>
public sealed class OpenIddictCertificateOptions
{
    public const string SectionName = "OpenIddict:Certificates";

    public CertificateFile Encryption { get; init; } = new();
    public CertificateFile Signing { get; init; } = new();
}

public sealed class CertificateFile
{
    /// <summary>Absolute path to a PKCS#12 (.pfx) file on the container filesystem.</summary>
    public string? Path { get; init; }

    /// <summary>Password protecting the PFX file. Must be supplied via env-var, never in JSON.</summary>
    public string? Password { get; init; }
}
