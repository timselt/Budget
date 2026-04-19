using BudgetTracker.Application.Reconciliation.Import;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.Reconciliation.Import;

public sealed class ColumnMappingResolverTests
{
    private static ColumnMappingResolver MakeResolver(
        params (string canonical, string[] aliases)[] mappings)
    {
        var dict = mappings.ToDictionary(
            m => m.canonical,
            m => (IReadOnlyList<string>)m.aliases);
        return new ColumnMappingResolver(dict);
    }

    [Theory]
    [InlineData("policy_no", "policy_no")]
    [InlineData("Policy_No", "policy_no")]                // büyük-küçük
    [InlineData("POLICY NO", "policy_no")]                 // boşluk
    [InlineData("policy.no", "policy_no")]                 // nokta
    [InlineData("policy-no", "policy_no")]                 // tire
    public void Resolve_VariantsMapToCanonical(string header, string expected)
    {
        var resolver = MakeResolver(("policy_no", new[] { "policy_no" }));
        resolver.Resolve(header).Should().Be(expected);
    }

    [Theory]
    [InlineData("Müşteri Kodu", "external_customer_ref")]
    [InlineData("MUSTERI KODU", "external_customer_ref")]
    [InlineData("musteri_kodu", "external_customer_ref")]
    [InlineData("logo_kodu", "external_customer_ref")]    // alias
    [InlineData("LOGO_KODU", "external_customer_ref")]
    public void Resolve_TurkishCharsAndAliases(string header, string expected)
    {
        var resolver = MakeResolver(
            ("external_customer_ref",
                new[] { "external_customer_ref", "musteri_kodu", "logo_kodu" }));
        resolver.Resolve(header).Should().Be(expected);
    }

    [Theory]
    [InlineData("Şirket Adı")]
    [InlineData("Hizmet Bedeli")]
    public void Resolve_UnknownHeader_ReturnsNull(string header)
    {
        var resolver = MakeResolver(("policy_no", new[] { "policy_no" }));
        resolver.Resolve(header).Should().BeNull();
    }

    [Fact]
    public void Resolve_EmptyHeader_ReturnsNull()
    {
        var resolver = MakeResolver(("policy_no", new[] { "policy_no" }));
        resolver.Resolve("").Should().BeNull();
        resolver.Resolve("   ").Should().BeNull();
    }

    [Fact]
    public void ResolveAll_ReturnsCanonicalToIndexMap()
    {
        var resolver = MakeResolver(
            ("policy_no", new[] { "policy_no", "police_no" }),
            ("product_code", new[] { "product_code", "urun_kodu" }));

        var headers = new[] { "Police_No", "Ürün Kodu", "ignored_extra" };
        var result = resolver.ResolveAll(headers);

        result.Should().ContainKey("policy_no").WhoseValue.Should().Be(0);
        result.Should().ContainKey("product_code").WhoseValue.Should().Be(1);
        result.Should().HaveCount(2); // ignored_extra atlandı
    }

    [Fact]
    public void ResolveAll_DuplicateMapping_Throws()
    {
        var resolver = MakeResolver(
            ("policy_no", new[] { "policy_no", "police_no" }));

        var headers = new[] { "Police_No", "POLICY NO" }; // ikisi de policy_no'ya gidiyor
        var act = () => resolver.ResolveAll(headers);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*duplicate column mapping*");
    }

    [Fact]
    public void Constructor_AliasCollision_Throws()
    {
        var dict = new Dictionary<string, IReadOnlyList<string>>
        {
            ["policy_no"] = new[] { "policy_no", "shared" },
            ["product_code"] = new[] { "product_code", "shared" }, // çakışma
        };
        var act = () => new ColumnMappingResolver(dict);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*alias collision*");
    }

    [Theory]
    [InlineData("İŞARET", "isaret")]
    [InlineData("Çağ Lı   ", "cagli")]
    [InlineData("ÜLKEMİZ", "ulkemiz")]
    [InlineData("Şehir_Adı", "sehiradi")]
    [InlineData("MİLLİ", "milli")]
    public void Normalize_TurkishCharacters(string input, string expected)
    {
        ColumnMappingResolver.Normalize(input).Should().Be(expected);
    }
}
