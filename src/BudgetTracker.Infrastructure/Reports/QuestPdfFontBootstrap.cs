using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Infrastructure;

namespace BudgetTracker.Infrastructure.Reports;

/// <summary>
/// Registers the embedded Lato TTFs with QuestPDF's <see cref="FontManager"/>
/// exactly once per process (ADR-0008 §2.2) and sets the QuestPDF Community
/// license so <c>GeneratePdf()</c> does not fail the license-reminder check.
/// Idempotent and safe to call from any static constructor — Interlocked
/// guarantees a single registration even under concurrent first use.
/// </summary>
internal static class QuestPdfFontBootstrap
{
    private const string FontNamespace = "BudgetTracker.Infrastructure.Resources.Fonts";
    private static int _registered;

    public static void Register()
    {
        if (Interlocked.Exchange(ref _registered, 1) == 1) return;

        // QuestPDF requires an explicit license selection before the first
        // GeneratePdf call. Running the library outside the API process (unit
        // tests, CLI seeders) must not depend on Program.cs having run first.
        QuestPDF.Settings.License = LicenseType.Community;

        var assembly = typeof(QuestPdfFontBootstrap).Assembly;
        RegisterFromResource(assembly, $"{FontNamespace}.Lato-Regular.ttf");
        RegisterFromResource(assembly, $"{FontNamespace}.Lato-Bold.ttf");
    }

    private static void RegisterFromResource(Assembly assembly, string resourceName)
    {
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Embedded font resource missing: {resourceName}. " +
                "Ensure BudgetTracker.Infrastructure.csproj still marks the TTF as <EmbeddedResource>.");
        FontManager.RegisterFont(stream);
    }
}
