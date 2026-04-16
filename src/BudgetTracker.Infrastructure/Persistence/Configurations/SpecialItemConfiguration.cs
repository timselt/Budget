using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class SpecialItemConfiguration : IEntityTypeConfiguration<SpecialItem>
{
    public void Configure(EntityTypeBuilder<SpecialItem> b)
    {
        b.ToTable("special_items");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.VersionId);
        b.HasOne<BudgetVersion>().WithMany().HasForeignKey(x => x.VersionId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.BudgetYearId).IsRequired();
        b.HasOne<BudgetYear>().WithMany().HasForeignKey(x => x.BudgetYearId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ItemType)
            .HasConversion(new EnumToStringConverter<SpecialItemType>())
            .HasMaxLength(30)
            .IsRequired();

        b.Property(x => x.Month);

        b.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        b.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyCode).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Notes);
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
