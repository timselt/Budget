using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class BudgetYearConfiguration : IEntityTypeConfiguration<BudgetYear>
{
    public void Configure(EntityTypeBuilder<BudgetYear> b)
    {
        b.ToTable("budget_years");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Year).IsRequired();
        b.Property(x => x.IsLocked).IsRequired();

        b.HasIndex(x => new { x.CompanyId, x.Year }).IsUnique();
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
