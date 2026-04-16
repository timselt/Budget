using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class ImportPeriodConfiguration : IEntityTypeConfiguration<ImportPeriod>
{
    public void Configure(EntityTypeBuilder<ImportPeriod> b)
    {
        b.ToTable("import_periods");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.SegmentId).IsRequired();
        b.HasOne(x => x.Segment).WithMany().HasForeignKey(x => x.SegmentId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ImportDate).IsRequired();
        b.Property(x => x.FileName).HasMaxLength(500).IsRequired();
        b.Property(x => x.PeriodLabel).HasMaxLength(50);

        b.Property(x => x.TotalAmount).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.OverdueAmount).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.PendingAmount).HasPrecision(18, 2).IsRequired();

        b.Property(x => x.Status)
            .HasConversion(new EnumToStringConverter<ImportPeriodStatus>())
            .HasMaxLength(20)
            .IsRequired();

        b.Property(x => x.CreatedAt).IsRequired();

        b.HasMany(x => x.Invoices)
            .WithOne(x => x.ImportPeriod)
            .HasForeignKey(x => x.ImportPeriodId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.CompanyId, x.SegmentId, x.ImportDate });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
