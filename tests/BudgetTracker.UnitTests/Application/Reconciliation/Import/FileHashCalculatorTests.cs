using System.Text;
using BudgetTracker.Application.Reconciliation.Import;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

public sealed class FileHashCalculatorTests
{
    [Fact]
    public async Task ComputeSha256HexAsync_KnownInput_ReturnsExpectedHash()
    {
        // SHA-256("hello world") known constant
        const string expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
        var bytes = Encoding.UTF8.GetBytes("hello world");
        await using var stream = new MemoryStream(bytes);

        var hash = await FileHashCalculator.ComputeSha256HexAsync(stream);

        hash.Should().Be(expected);
        hash.Length.Should().Be(64);
        hash.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [Fact]
    public async Task ComputeSha256HexAsync_RestoresStreamPosition()
    {
        var bytes = Encoding.UTF8.GetBytes("payload");
        await using var stream = new MemoryStream(bytes);
        stream.Position = 0;

        await FileHashCalculator.ComputeSha256HexAsync(stream);

        stream.Position.Should().Be(0);
    }

    [Fact]
    public async Task ComputeSha256HexAsync_NonSeekableStream_Throws()
    {
        await using var inner = new MemoryStream(Encoding.UTF8.GetBytes("data"));
        await using var nonSeekable = new NonSeekableStream(inner);

        var act = async () => await FileHashCalculator.ComputeSha256HexAsync(nonSeekable);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ComputeSha256HexAsync_SameContent_ReturnsSameHash()
    {
        var content = "duplicate test content";
        await using var s1 = new MemoryStream(Encoding.UTF8.GetBytes(content));
        await using var s2 = new MemoryStream(Encoding.UTF8.GetBytes(content));

        var h1 = await FileHashCalculator.ComputeSha256HexAsync(s1);
        var h2 = await FileHashCalculator.ComputeSha256HexAsync(s2);

        h1.Should().Be(h2);
    }

    private sealed class NonSeekableStream(Stream inner) : Stream
    {
        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }
        public override void Flush() => inner.Flush();
        public override int Read(byte[] buffer, int offset, int count)
            => inner.Read(buffer, offset, count);
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
