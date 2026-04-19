using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ReconciliationBatch EF mapping (Faz 1 spec §3.2). Tablo
/// <c>reconciliation_batches</c>. Duplicate import koruması:
/// (company_id, source_file_hash) unique. Period + status filtreleme için
/// composite index.
/// </summary>
public sealed class ReconciliationBatchConfiguration
    : IEntityTypeConfiguration<ReconciliationBatch>
{
    public void Configure(EntityTypeBuilder<ReconciliationBatch> b)
    {
        b.ToTable("reconciliation_batches");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Flow).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.PeriodCode).IsRequired().HasMaxLength(7).IsFixedLength();
        b.Property(x => x.SourceType).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.SourceFileName).IsRequired().HasMaxLength(255);
        b.Property(x => x.SourceFileHash).IsRequired().HasMaxLength(64).IsFixedLength();
        b.Property(x => x.RowCount).IsRequired();
        b.Property(x => x.ImportedByUserId).IsRequired();
        b.Property(x => x.ImportedAt).IsRequired();
        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Notes).HasMaxLength(1000);

        b.HasMany(x => x.SourceRows)
            .WithOne()
            .HasForeignKey(r => r.BatchId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Metadata.FindNavigation(nameof(ReconciliationBatch.SourceRows))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        b.HasIndex(x => new { x.CompanyId, x.SourceFileHash }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.Flow, x.PeriodCode, x.Status });
        b.HasIndex(x => new { x.CompanyId, x.ImportedAt });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
