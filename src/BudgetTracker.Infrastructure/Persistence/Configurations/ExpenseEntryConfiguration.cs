using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class ExpenseEntryConfiguration : IEntityTypeConfiguration<ExpenseEntry>
{
    public void Configure(EntityTypeBuilder<ExpenseEntry> b)
    {
        b.ToTable("expense_entries");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.VersionId);
        b.HasOne<BudgetVersion>().WithMany().HasForeignKey(x => x.VersionId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.BudgetYearId).IsRequired();
        b.HasOne<BudgetYear>().WithMany().HasForeignKey(x => x.BudgetYearId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CategoryId).IsRequired();
        b.HasOne<ExpenseCategory>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Month).IsRequired();

        b.Property(x => x.EntryType)
            .HasConversion(new EnumToStringConverter<ExpenseEntryType>())
            .HasMaxLength(10)
            .IsRequired();

        b.Property(x => x.AmountOriginal).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        b.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyCode).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.AmountTryFixed).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.AmountTrySpot).HasPrecision(18, 2).IsRequired();

        b.Property(x => x.Notes);
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => new { x.CompanyId, x.BudgetYearId, x.CategoryId, x.Month });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
