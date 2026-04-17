using System.Security.Cryptography.X509Certificates;

namespace BudgetTracker.Api.Configuration;

internal static class ProductionCertificateLoader
{
    public static X509Certificate2 Load(CertificateFile file, string purpose)
    {
        if (string.IsNullOrWhiteSpace(file.Path))
        {
            throw new InvalidOperationException(
                $"OpenIddict:Certificates:{purpose}:Path is required in non-Development environments. " +
                "Configure via Railway secret (mounted file path).");
        }

        if (string.IsNullOrWhiteSpace(file.Password))
        {
            throw new InvalidOperationException(
                $"OpenIddict:Certificates:{purpose}:Password is required in non-Development environments. " +
                "Configure via Railway secret env-var — never commit the password.");
        }

        if (!File.Exists(file.Path))
        {
            // Keep the resolved filesystem path out of the user-visible exception message
            // to avoid leaking internal volume-mount details via a startup crash dump.
            // Operators can still find the missing path in structured logs (the Railway
            // platform captures stderr + our ILogger output at process start).
            Console.Error.WriteLine(
                $"[cert-loader] {purpose} certificate missing at '{file.Path}'");
            throw new FileNotFoundException(
                $"OpenIddict {purpose} certificate volume mount is missing. " +
                "Check the release runbook.");
        }

        // EphemeralKeySet keeps the private key in-memory only — on a container-based
        // deployment there is no persistent key store to leak into, and MachineKeySet
        // would add filesystem writes we don't want.
        return X509CertificateLoader.LoadPkcs12FromFile(
            file.Path,
            file.Password,
            X509KeyStorageFlags.EphemeralKeySet);
    }
}
