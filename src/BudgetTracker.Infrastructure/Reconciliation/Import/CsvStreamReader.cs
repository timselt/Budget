using System.Globalization;
using System.Text;
using BudgetTracker.Application.Reconciliation.Import;
using CsvHelper;
using CsvHelper.Configuration;

namespace BudgetTracker.Infrastructure.Reconciliation.Import;

/// <summary>
/// .csv dosyalarını CsvHelper ile okur. Ayraç (delimiter) ilk N byte'tan
/// otomatik tespit edilir: TR locale (;) ve EN (,) yaygın; tab da kabul.
/// UTF-8 default; BOM'lu UTF-8 transparent. Başlık ilk satırdadır;
/// boş ilk satır tolere edilir.
/// </summary>
public sealed class CsvStreamReader : IImportStreamReader
{
    private const int DelimiterDetectionByteCount = 4096;
    private static readonly char[] CandidateDelimiters = { ';', ',', '\t', '|' };

    public async Task<ImportReadResult> ReadAsync(
        Stream stream,
        int maxRows,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(stream);
        if (maxRows <= 0) throw new ArgumentOutOfRangeException(nameof(maxRows));

        try
        {
            // Stream rewindable değilse buffer'a al — delimiter tespit
            // ettikten sonra başa dönmemiz lazım.
            byte[] sampleBuffer;
            byte[] fullContent;
            if (stream.CanSeek)
            {
                var startPos = stream.Position;
                sampleBuffer = await ReadSampleAsync(stream, cancellationToken).ConfigureAwait(false);
                stream.Position = startPos;
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms, cancellationToken).ConfigureAwait(false);
                fullContent = ms.ToArray();
            }
            else
            {
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms, cancellationToken).ConfigureAwait(false);
                fullContent = ms.ToArray();
                sampleBuffer = fullContent.Length <= DelimiterDetectionByteCount
                    ? fullContent
                    : fullContent.AsSpan(0, DelimiterDetectionByteCount).ToArray();
            }

            var delimiter = DetectDelimiter(sampleBuffer);

            using var ms2 = new MemoryStream(fullContent);
            using var reader = new StreamReader(ms2, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = delimiter,
                BadDataFound = null, // sessizce yut; detector bireysel hücreyi parse eder
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim,
                IgnoreBlankLines = true,
            };
            using var csv = new CsvReader(reader, config);

            // İlk satır boşsa atla, sonraki satırı header kabul et (ilk 2 satır
            // toleransı — spec §6.3).
            if (!await csv.ReadAsync().ConfigureAwait(false))
            {
                return new ImportReadResult(Array.Empty<string>(),
                    Array.Empty<IReadOnlyDictionary<string, string?>>(), Truncated: false);
            }

            var firstRowFields = ReadCurrentRow(csv);
            var headers = firstRowFields.Where(f => !string.IsNullOrWhiteSpace(f)).ToList();
            if (headers.Count == 0)
            {
                if (!await csv.ReadAsync().ConfigureAwait(false))
                {
                    return new ImportReadResult(Array.Empty<string>(),
                        Array.Empty<IReadOnlyDictionary<string, string?>>(), Truncated: false);
                }
                headers = ReadCurrentRow(csv).Where(f => !string.IsNullOrWhiteSpace(f)).ToList();
            }

            if (headers.Count == 0)
            {
                throw new ImportReadException("csv header row is empty");
            }

            csv.ReadHeader(); // header satırını CsvHelper'a kaydet (CurrentRecord index için)

            var dataRows = new List<IReadOnlyDictionary<string, string?>>();
            var truncated = false;
            var seenRows = 0;

            while (await csv.ReadAsync().ConfigureAwait(false))
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (seenRows >= maxRows)
                {
                    truncated = true;
                    break;
                }

                var fields = ReadCurrentRow(csv);
                var dict = new Dictionary<string, string?>(StringComparer.Ordinal);
                var hasContent = false;

                for (var i = 0; i < headers.Count; i++)
                {
                    var value = i < fields.Count ? fields[i] : null;
                    var trimmed = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
                    dict[headers[i]] = trimmed;
                    if (trimmed is not null) hasContent = true;
                }

                if (!hasContent) continue;
                dataRows.Add(dict);
                seenRows++;
            }

            return new ImportReadResult(headers, dataRows, truncated);
        }
        catch (ImportReadException) { throw; }
        catch (Exception ex)
        {
            throw new ImportReadException("failed to read csv file", ex);
        }
    }

    private static async Task<byte[]> ReadSampleAsync(Stream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[DelimiterDetectionByteCount];
        var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)
            .ConfigureAwait(false);
        return read == buffer.Length ? buffer : buffer.AsSpan(0, read).ToArray();
    }

    /// <summary>
    /// İlk satır içinde her aday delimiter'ın frekansını sayar; en yüksek
    /// olan kazanır. Hiçbiri yoksa fallback ',' (CSV standardı).
    /// </summary>
    private static string DetectDelimiter(byte[] sample)
    {
        if (sample.Length == 0) return ",";

        var text = Encoding.UTF8.GetString(sample);
        var firstLineEnd = text.IndexOfAny(new[] { '\r', '\n' });
        var firstLine = firstLineEnd > 0 ? text[..firstLineEnd] : text;

        var counts = CandidateDelimiters
            .Select(d => (Delim: d.ToString(), Count: firstLine.Count(c => c == d)))
            .OrderByDescending(x => x.Count)
            .ToList();

        return counts[0].Count > 0 ? counts[0].Delim : ",";
    }

    private static List<string> ReadCurrentRow(CsvReader csv)
    {
        var count = csv.Parser.Count;
        var list = new List<string>(count);
        for (var i = 0; i < count; i++)
        {
            var value = csv.GetField(i) ?? string.Empty;
            list.Add(value);
        }
        return list;
    }
}
