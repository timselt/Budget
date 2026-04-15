using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class CurrencyConfiguration : IEntityTypeConfiguration<Currency>
{
    public void Configure(EntityTypeBuilder<Currency> b)
    {
        b.ToTable("currencies");
        b.HasKey(x => x.Code);
        b.Property(x => x.Code).HasMaxLength(3).IsFixedLength().IsRequired();
        b.Property(x => x.Name).HasMaxLength(64).IsRequired();
        b.Property(x => x.Symbol).HasMaxLength(8).IsRequired();
        b.Property(x => x.DecimalPlaces).IsRequired();
    }
}
