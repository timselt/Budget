using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ReconciliationLine EF mapping (Faz 1 spec §3.5). Tablo
/// <c>reconciliation_lines</c>. <b>Sprint 1:</b> tablo iskelet — line
/// auto-create Sprint 2'de PriceBook lookup ile devreye girer.
/// </summary>
public sealed class ReconciliationLineConfiguration
    : IEntityTypeConfiguration<ReconciliationLine>
{
    public void Configure(EntityTypeBuilder<ReconciliationLine> b)
    {
        b.ToTable("reconciliation_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CaseId).IsRequired();
        b.HasOne<ReconciliationCase>().WithMany().HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Property(x => x.SourceRowId).IsRequired();
        b.HasOne<ReconciliationSourceRow>().WithMany().HasForeignKey(x => x.SourceRowId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ProductCode).IsRequired().HasMaxLength(100);
        b.Property(x => x.ProductName).IsRequired().HasMaxLength(255);
        b.Property(x => x.Quantity).IsRequired().HasColumnType("numeric(18,4)");
        b.Property(x => x.UnitPrice).IsRequired().HasColumnType("numeric(18,4)");
        b.Property(x => x.Amount).IsRequired().HasColumnType("numeric(18,2)");
        b.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3).IsFixedLength();
        b.Property(x => x.PriceSourceRef).IsRequired().HasMaxLength(255);
        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.DisputeReasonCode).HasConversion<string>().HasMaxLength(40);
        b.Property(x => x.DisputeNote).HasMaxLength(2000);

        b.HasIndex(x => new { x.CaseId, x.Status });
        b.HasIndex(x => x.SourceRowId);
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
