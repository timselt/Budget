#!/usr/bin/env dotnet-script
#r "nuget: Npgsql, 9.0.3"

// ---------------------------------------------------------------------------
// Mutabakat Önkoşul #1 (00a §2.4) — Customer.external_customer_ref backfill.
//
// CSV formatı (header zorunlu, virgül ayraç, UTF-8):
//     customer_id,external_customer_ref,external_source_system
//     12,1500003063,LOGO
//     13,1500003064,LOGO
//     27,1500007788,MIKRO
//
// Kullanım:
//     dotnet script scripts/backfill-customer-ext-ref.csx -- \
//         "Host=localhost;Port=5432;Database=budgettracker;Username=postgres;Password=..." \
//         path/to/mapping.csv [--dry-run]
//
// Davranış:
//  - Tek PostgreSQL transaction'ında çalışır.
//  - Her satırda UPDATE yapar; affected != 1 olursa işlem ROLLBACK edilir,
//    çıkış kodu 1 döner.
//  - Aynı tenant'ta mevcut bir external_ref ile çakışma olursa koşullu
//    UNIQUE index (ix_customer_external_ref) hatası fırlatır ve rollback olur.
//  - --dry-run flag'i varsa transaction commit yerine rollback ile kapanır;
//    hangi satırların yazılacağını rapor eder.
//  - verified_at = NOW() (UTC, server clock); verified_by = NULL
//    (interaktif kullanıcı yok). UI üzerinden bağlanan kayıtlar ayrıca
//    verified_by alanını doldurur.
// ---------------------------------------------------------------------------

using Npgsql;
using System.Globalization;

if (Args.Count < 2)
{
    Console.Error.WriteLine("Kullanım: dotnet script backfill-customer-ext-ref.csx -- <connString> <csvPath> [--dry-run]");
    Environment.Exit(2);
}

var connString = Args[0];
var csvPath = Args[1];
var dryRun = Args.Count > 2 && Args[2].Equals("--dry-run", StringComparison.OrdinalIgnoreCase);

if (!File.Exists(csvPath))
{
    Console.Error.WriteLine($"CSV bulunamadı: {csvPath}");
    Environment.Exit(2);
}

var lines = File.ReadAllLines(csvPath);
if (lines.Length < 2)
{
    Console.Error.WriteLine("CSV boş veya yalnızca header var.");
    Environment.Exit(2);
}

var header = lines[0].Split(',').Select(h => h.Trim().ToLowerInvariant()).ToArray();
var expected = new[] { "customer_id", "external_customer_ref", "external_source_system" };
if (!header.SequenceEqual(expected))
{
    Console.Error.WriteLine($"Header hatalı. Beklenen: {string.Join(',', expected)}");
    Environment.Exit(2);
}

await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

await using var tx = await conn.BeginTransactionAsync();

var applied = 0;
var lineNo = 1;

try
{
    foreach (var raw in lines.Skip(1))
    {
        lineNo++;
        if (string.IsNullOrWhiteSpace(raw)) continue;

        var cols = raw.Split(',');
        if (cols.Length != 3)
        {
            throw new InvalidDataException($"Satır {lineNo}: 3 kolon bekleniyor, {cols.Length} bulundu.");
        }

        if (!int.TryParse(cols[0].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var id))
        {
            throw new InvalidDataException($"Satır {lineNo}: customer_id sayı değil: '{cols[0]}'");
        }

        var extRef = cols[1].Trim();
        var source = cols[2].Trim().ToUpperInvariant();

        if (string.IsNullOrEmpty(extRef) || extRef.Length > 32)
        {
            throw new InvalidDataException($"Satır {lineNo}: external_customer_ref boş veya >32: '{extRef}'");
        }

        if (source is not ("LOGO" or "MIKRO" or "MANUAL"))
        {
            throw new InvalidDataException($"Satır {lineNo}: source LOGO/MIKRO/MANUAL olmalı: '{source}'");
        }

        await using var cmd = new NpgsqlCommand(
            """
            UPDATE customers
               SET external_customer_ref = @ref,
                   external_source_system = @src,
                   external_ref_verified_at = NOW()
             WHERE id = @id
               AND deleted_at IS NULL
            """, conn, tx);
        cmd.Parameters.AddWithValue("ref", extRef);
        cmd.Parameters.AddWithValue("src", source);
        cmd.Parameters.AddWithValue("id", id);

        var affected = await cmd.ExecuteNonQueryAsync();
        if (affected != 1)
        {
            throw new InvalidOperationException(
                $"Satır {lineNo}: customer_id={id} bulunamadı ya da silinmiş. Beklenen: 1 etkilenen; gerçek: {affected}");
        }

        applied++;
    }

    if (dryRun)
    {
        await tx.RollbackAsync();
        Console.WriteLine($"[dry-run] {applied} satır yazılacaktı — transaction ROLLBACK edildi.");
    }
    else
    {
        await tx.CommitAsync();
        Console.WriteLine($"OK: {applied} müşteri backfill edildi (commit).");
    }
}
catch (Exception ex)
{
    await tx.RollbackAsync();
    Console.Error.WriteLine($"HATA (rollback): {ex.Message}");
    Environment.Exit(1);
}
