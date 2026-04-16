using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class ActualEntryConfiguration : IEntityTypeConfiguration<ActualEntry>
{
    public void Configure(EntityTypeBuilder<ActualEntry> b)
    {
        b.ToTable("actual_entries");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.BudgetYearId).IsRequired();
        b.HasOne<BudgetYear>().WithMany().HasForeignKey(x => x.BudgetYearId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Month).IsRequired();

        b.Property(x => x.EntryType)
            .HasConversion(new EnumToStringConverter<EntryType>())
            .HasMaxLength(10)
            .IsRequired();

        b.Property(x => x.AmountOriginal).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        b.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyCode).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.AmountTryFixed).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.AmountTrySpot).HasPrecision(18, 2).IsRequired();

        b.Property(x => x.Source)
            .HasConversion(new EnumToStringConverter<ActualSource>())
            .HasMaxLength(16)
            .IsRequired();

        b.Property(x => x.SyncedAt);
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => new { x.CompanyId, x.BudgetYearId, x.CustomerId, x.Month, x.EntryType }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.BudgetYearId, x.CustomerId, x.Month });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
