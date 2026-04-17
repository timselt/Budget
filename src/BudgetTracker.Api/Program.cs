using System.Security.Cryptography.X509Certificates;
using BudgetTracker.Api.Configuration;
using BudgetTracker.Api.Filters;
using BudgetTracker.Api.Middleware;
using BudgetTracker.Application;
using BudgetTracker.Infrastructure;
using BudgetTracker.Infrastructure.Authentication;
using BudgetTracker.Infrastructure.BackgroundJobs;
using BudgetTracker.Infrastructure.Identity;
using BudgetTracker.Infrastructure.Persistence;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();

// OpenIddict certificates: load X509 from disk outside Development.
// Dev keeps the existing ephemeral-cert behaviour so local runs stay zero-config.
X509Certificate2? openIddictEncryptionCert = null;
X509Certificate2? openIddictSigningCert = null;
if (!builder.Environment.IsDevelopment())
{
    var certOptions = builder.Configuration
        .GetSection(OpenIddictCertificateOptions.SectionName)
        .Get<OpenIddictCertificateOptions>() ?? new OpenIddictCertificateOptions();

    openIddictEncryptionCert = ProductionCertificateLoader.Load(certOptions.Encryption, "Encryption");
    openIddictSigningCert = ProductionCertificateLoader.Load(certOptions.Signing, "Signing");
}

builder.Services.AddInfrastructure(
    builder.Configuration,
    openIddictEncryptionCert: openIddictEncryptionCert,
    openIddictSigningCert: openIddictSigningCert,
    disableTransportSecurity: builder.Environment.IsDevelopment());

// Hangfire — storage + in-process server. Dashboard UI lands in F2 with
// an OpenIddict-backed authorization filter (ADR-0007 pending).
var hangfireConnectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required for Hangfire storage.");

builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
          .UseSimpleAssemblyNameTypeSerializer()
          .UseRecommendedSerializerSettings()
          .UsePostgreSqlStorage(opt => opt.UseNpgsqlConnection(hangfireConnectionString));
});

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = Math.Max(2, Environment.ProcessorCount);
    options.ServerName = $"budget-tracker-{Environment.MachineName}";
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(
        name: "postgres",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "ready", "db" });

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<FluentValidationFilter>();
});
builder.Services.AddOpenApi();

var app = builder.Build();

// One-shot seed mode for production releases. Invoked as:
//   dotnet BudgetTracker.Api.dll --seed-prod-oidc-client
// Exits after seeding without starting the HTTP pipeline.
// Refuses to run in Development so a misfired command cannot pollute the dev
// database with a production-shaped client.
if (args.Contains("--seed-prod-oidc-client"))
{
    if (app.Environment.IsDevelopment())
    {
        Console.Error.WriteLine(
            "[seed-prod-oidc-client] Refusing to run in the Development environment. " +
            "Set ASPNETCORE_ENVIRONMENT=Production (or Staging) and retry.");
        Environment.Exit(1);
        return;
    }
    using var scope = app.Services.CreateScope();
    await ProductionOidcClientSeeder.SeedAsync(scope.ServiceProvider);
    return;
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    await IdentitySeeder.SeedAsync(app.Services);
}

// Register recurring jobs once the service provider is ready.
// Skip in "Testing" env so WebApplicationFactory-based tests don't touch real storage.
if (!app.Environment.IsEnvironment("Testing"))
{
    HangfireRecurringJobs.Register(app.Services);
}

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
});

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantResolutionMiddleware>();
app.MapControllers();

app.Run();

public partial class Program;
