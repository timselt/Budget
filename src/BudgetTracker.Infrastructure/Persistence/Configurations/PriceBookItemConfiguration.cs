using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// PriceBookItem EF mapping (00b §2.1). Tablo <c>price_book_items</c>.
/// Unique <c>(price_book_id, product_code)</c> — aynı sürümde aynı ürün kodu tek.
/// </summary>
public sealed class PriceBookItemConfiguration : IEntityTypeConfiguration<PriceBookItem>
{
    public void Configure(EntityTypeBuilder<PriceBookItem> b)
    {
        b.ToTable("price_book_items");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.PriceBookId).IsRequired();
        b.Property(x => x.ProductCode).IsRequired().HasMaxLength(64);
        b.Property(x => x.ProductName).IsRequired().HasMaxLength(255);
        b.Property(x => x.ItemType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Unit).IsRequired().HasMaxLength(16);
        b.Property(x => x.UnitPrice).IsRequired().HasColumnType("numeric(18,4)");
        b.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3).IsFixedLength();
        b.Property(x => x.TaxRate).HasColumnType("numeric(5,2)");
        b.Property(x => x.MinQuantity).HasColumnType("numeric(18,4)");
        b.Property(x => x.Notes).HasMaxLength(1000);

        b.HasIndex(x => new { x.PriceBookId, x.ProductCode }).IsUnique();
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
