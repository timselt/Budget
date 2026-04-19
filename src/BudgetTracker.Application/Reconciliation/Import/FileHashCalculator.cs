using System.Security.Cryptography;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Source dosyanın SHA-256 hash'ini hex string olarak hesaplar.
/// Duplicate import koruması (spec §6.3): aynı (company_id, source_file_hash)
/// tuple'ı varsa <c>DuplicateImportException</c>. Stream rewindable
/// olmalı; pozisyon hash sonrası başa alınır.
/// </summary>
public static class FileHashCalculator
{
    /// <summary>
    /// Stream'i hash'ler ve <see cref="Stream.Position"/>'unu hash öncesine
    /// geri alır (CanSeek=true varsayımı). 64 karakter lowercase hex döner.
    /// </summary>
    public static async Task<string> ComputeSha256HexAsync(
        Stream stream,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(stream);
        if (!stream.CanSeek)
            throw new ArgumentException("stream must be seekable", nameof(stream));

        var startPos = stream.Position;
        try
        {
            var hashBytes = await SHA256.HashDataAsync(stream, cancellationToken)
                .ConfigureAwait(false);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }
        finally
        {
            stream.Position = startPos;
        }
    }
}

/// <summary>
/// Aynı (company_id, source_file_hash) batch zaten varsa fırlatılır.
/// Spec §6.3 — duplicate import engeli. UI tarafı bu exception'ı 409
/// Conflict response'a map'ler.
/// </summary>
public sealed class DuplicateImportException : Exception
{
    public DuplicateImportException(string sourceFileHash, int existingBatchId)
        : base($"file with SHA-256 hash '{sourceFileHash}' already imported as batch #{existingBatchId}")
    {
        SourceFileHash = sourceFileHash;
        ExistingBatchId = existingBatchId;
    }

    public string SourceFileHash { get; }
    public int ExistingBatchId { get; }
}
