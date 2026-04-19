using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// PriceBook EF mapping (00b §2.1). Tablo <c>price_books</c>. Aynı Contract için
/// tek Active sürüm garantisi EXCLUDE USING gist constraint'iyle migration'da
/// kurulur (EF Core bu constraint'i modellemez).
/// </summary>
public sealed class PriceBookConfiguration : IEntityTypeConfiguration<PriceBook>
{
    public void Configure(EntityTypeBuilder<PriceBook> b)
    {
        b.ToTable("price_books");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ContractId).IsRequired();
        b.HasOne<Contract>().WithMany().HasForeignKey(x => x.ContractId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.VersionNo).IsRequired();
        b.Property(x => x.EffectiveFrom).IsRequired();
        b.Property(x => x.EffectiveTo);
        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Notes).HasMaxLength(1000);
        b.Property(x => x.ApprovedByUserId);
        b.Property(x => x.ApprovedAt);

        b.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(i => i.PriceBookId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Metadata.FindNavigation(nameof(PriceBook.Items))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        b.HasIndex(x => new { x.ContractId, x.VersionNo }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.Status });
        b.HasIndex(x => new { x.ContractId, x.Status, x.EffectiveFrom });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
