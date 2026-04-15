using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class FxRateConfiguration : IEntityTypeConfiguration<FxRate>
{
    public void Configure(EntityTypeBuilder<FxRate> b)
    {
        b.ToTable("fx_rates");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        b.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyCode);

        b.Property(x => x.RateDate).IsRequired();
        b.Property(x => x.RateValue).HasPrecision(18, 8).IsRequired();

        b.Property(x => x.Source)
            .HasConversion(new EnumToStringConverter<FxRateSource>())
            .HasMaxLength(16)
            .IsRequired();

        b.Property(x => x.IsYearStartFixed).IsRequired();
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => new { x.CurrencyCode, x.RateDate, x.IsYearStartFixed }).IsUnique();
    }
}
