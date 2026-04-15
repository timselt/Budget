using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> b)
    {
        b.ToTable("companies");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.Code).HasMaxLength(32).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();

        b.Property(x => x.Name).HasMaxLength(256).IsRequired();
        b.Property(x => x.BaseCurrencyCode).HasMaxLength(3).IsRequired().IsFixedLength();

        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.DeletedAt);

        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
