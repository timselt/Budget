using BudgetTracker.Application.PriceBooks;
using FluentAssertions;

namespace BudgetTracker.UnitTests.Application.PriceBooks;

/// <summary>00b bulk CSV parser davranış testleri (RFC 4180 temel diyalekt).</summary>
public sealed class PriceBookCsvParserTests
{
    [Fact]
    public void Parse_HappyPath_ReturnsItems()
    {
        const string csv = """
            product_code,product_name,item_type,unit,unit_price,currency_code,tax_rate,notes
            KSK-001,Kasko Standart,InsurancePackage,USE,1250.50,TRY,20.0,ilk kalem
            KSK-002,Kasko Plus,InsurancePackage,USE,2000,TRY,20.0,
            """;

        var items = PriceBookCsvParser.Parse(new StringReader(csv));

        items.Should().HaveCount(2);
        items[0].ProductCode.Should().Be("KSK-001");
        items[0].UnitPrice.Should().Be(1250.50m);
        items[0].CurrencyCode.Should().Be("TRY");
        items[0].TaxRate.Should().Be(20.0m);
        items[1].Notes.Should().BeEmpty();
    }

    [Fact]
    public void Parse_SemicolonDelimiter_IsDetected()
    {
        const string csv = """
            product_code;product_name;item_type;unit;unit_price
            OTO-RSA-01;Yol Yardım Paketi;AutomotiveService;USE;250,75
            """;

        var items = PriceBookCsvParser.Parse(new StringReader(csv));

        items.Should().HaveCount(1);
        items[0].ProductCode.Should().Be("OTO-RSA-01");
        items[0].UnitPrice.Should().Be(250.75m);
    }

    [Fact]
    public void Parse_QuotedFieldWithComma_Retained()
    {
        const string csv = """
            product_code,product_name,item_type,unit,unit_price
            A1,"Acme, Inc. Paket",Other,USE,100
            """;

        var items = PriceBookCsvParser.Parse(new StringReader(csv));

        items[0].ProductName.Should().Be("Acme, Inc. Paket");
    }

    [Fact]
    public void Parse_MissingRequiredColumn_Throws()
    {
        const string csv = """
            product_code,product_name,unit,unit_price
            A1,Foo,USE,10
            """;

        var act = () => PriceBookCsvParser.Parse(new StringReader(csv));

        act.Should().Throw<InvalidOperationException>().WithMessage("*item_type*");
    }

    [Fact]
    public void Parse_EmptyRequiredField_Throws()
    {
        const string csv = """
            product_code,product_name,item_type,unit,unit_price
            ,Foo,Other,USE,10
            """;

        var act = () => PriceBookCsvParser.Parse(new StringReader(csv));

        act.Should().Throw<InvalidOperationException>().WithMessage("*product_code*");
    }

    [Fact]
    public void Parse_BlankLines_AreSkipped()
    {
        const string csv = """
            product_code,product_name,item_type,unit,unit_price
            A1,First,Other,USE,10

            A2,Second,Other,USE,20
            """;

        var items = PriceBookCsvParser.Parse(new StringReader(csv));

        items.Should().HaveCount(2);
    }
}
