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
using FluentValidation;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// ADR-0007 §2.2 — bootstrap logger captures anything that goes wrong before the
// host is built; after UseSerilog() the configured sinks take over.
// SelfLog routes enricher/sink failures to stderr so an enricher that silently
// drops properties (e.g. a Seq outage) is still visible to the operator.
Serilog.Debugging.SelfLog.Enable(Console.Error);
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Read Serilog config from appsettings.*.json + environment variables so Railway
    // can inject `Serilog__WriteTo__1__Args__serverUrl` (Seq ingest URL) and the
    // matching API key without a prod-specific settings file in the repo.
    builder.Host.UseSerilog((context, services, loggerConfig) => loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    builder.Services.AddApplication();

    // Api assembly'deki FluentValidation validator'larını da register et
    // (örn. ReconciliationBatchesController içindeki CreateBatchFormRequestValidator —
    // IFormFile reference'ı yüzünden Api katmanında tutuluyor).
    builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly, ServiceLifetime.Scoped);

    // One-shot seed runs (`--seed-bootstrap-admin`) exit before the OpenIddict
    // HTTP server is started, so skip prod-cert loading. This lets operators
    // seed a fresh non-dev DB without first provisioning certs that only the
    // request-handling path actually needs.
    var isSeedOnlyRun = args.Contains("--seed-bootstrap-admin");

    // OpenIddict certificates: load X509 from disk outside Development.
    // Dev keeps the existing ephemeral-cert behaviour so local runs stay zero-config.
    X509Certificate2? openIddictEncryptionCert = null;
    X509Certificate2? openIddictSigningCert = null;
    if (!builder.Environment.IsDevelopment() && !isSeedOnlyRun)
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

    // Hangfire — storage + in-process server. Dashboard UI is wired below.
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
            tags: new[] { "ready", "db" })
        .AddCheck<HangfireStorageHealthCheck>(
            name: "hangfire-storage",
            failureStatus: HealthStatus.Unhealthy,
            tags: new[] { "ready", "jobs" });

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

    // Faz 1.5 — Identity reset: TAG Portal SSO geçişi için bir defaya mahsus.
    // Dev/staging'de seed yenileme; prod'da explicit --force-reset gerektirir.
    if (args.Contains("--reset-identity-for-sso"))
    {
        var force = args.Contains("--force-reset");
        await IdentityResetForSso.ResetAsync(app.Services, forceInProduction: force);
        return;
    }

    // Bootstrap admin seed (one-shot). Creates the first Admin user on a
    // fresh staging/production DB so that /api/v1/account/register (which
    // requires Admin policy) is reachable. Reads BOOTSTRAP_ADMIN_EMAIL +
    // BOOTSTRAP_ADMIN_PASSWORD from the environment; idempotent — if the
    // email already has a user the call is a no-op.
    if (args.Contains("--seed-bootstrap-admin"))
    {
        if (app.Environment.IsDevelopment())
        {
            Console.Error.WriteLine(
                "[seed-bootstrap-admin] Dev env already seeds 5 test users via IdentitySeeder " +
                "(admin@tag.local / Devpass!2026). Set ASPNETCORE_ENVIRONMENT=Staging or Production " +
                "and retry if you need to bootstrap a non-dev database.");
            Environment.Exit(1);
            return;
        }
        using var scope = app.Services.CreateScope();
        await BootstrapAdminSeeder.SeedAsync(scope.ServiceProvider);
        return;
    }

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        await IdentitySeeder.SeedAsync(app.Services);
    }

    // Request-scoped Serilog log: captures method/path/status/duration + enricher
    // properties (tenant_id, user_id, request_id) on every HTTP request.
    app.UseSerilogRequestLogging();

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

    // Hangfire dashboard — ADR-0007 §2.1. Only Admin / Cfo roles pass the filter;
    // the default LocalRequestsOnlyAuthorizationFilter is replaced because on
    // Railway all requests are "remote" from the container's point of view.
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireDashboardAuthorizationFilter() },
        DashboardTitle = "FinOps Tur — Background Jobs",
    });

    app.MapControllers();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "BudgetTracker API terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
