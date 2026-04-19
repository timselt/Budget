using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class BudgetVersionConfiguration : IEntityTypeConfiguration<BudgetVersion>
{
    public void Configure(EntityTypeBuilder<BudgetVersion> b)
    {
        b.ToTable("budget_versions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.BudgetYearId).IsRequired();
        b.HasOne<BudgetYear>().WithMany().HasForeignKey(x => x.BudgetYearId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Name).HasMaxLength(256).IsRequired();
        b.Property(x => x.Status)
            .HasConversion(new EnumToStringConverter<BudgetVersionStatus>())
            .HasMaxLength(32)
            .IsRequired();
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.RejectionReason).HasMaxLength(1024);

        b.Property(x => x.SubmittedAt);
        b.Property(x => x.FinanceApprovedAt);
        b.Property(x => x.CfoApprovedAt);
        b.Property(x => x.ActivatedAt);

        // EXCLUDE constraint (single active version per company+year) is added in raw SQL migration
        // because EF Core does not model EXCLUDE constraints.

        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
