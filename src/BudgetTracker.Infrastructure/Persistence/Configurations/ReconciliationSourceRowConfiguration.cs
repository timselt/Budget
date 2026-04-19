using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ReconciliationSourceRow EF mapping (Faz 1 spec §3.3). Tablo
/// <c>reconciliation_source_rows</c>. RawPayload + ParseErrors jsonb;
/// (batch_id, row_number) unique — duplicate satır engeli.
/// </summary>
public sealed class ReconciliationSourceRowConfiguration
    : IEntityTypeConfiguration<ReconciliationSourceRow>
{
    public void Configure(EntityTypeBuilder<ReconciliationSourceRow> b)
    {
        b.ToTable("reconciliation_source_rows");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.BatchId).IsRequired();
        b.Property(x => x.ExternalCustomerRef).IsRequired().HasMaxLength(100);
        b.Property(x => x.ExternalDocumentRef).HasMaxLength(100);
        b.Property(x => x.RawPayload).IsRequired().HasColumnType("jsonb");
        b.Property(x => x.RowNumber).IsRequired();
        b.Property(x => x.ParsedAt).IsRequired();
        b.Property(x => x.ParseStatus).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ParseErrors).HasColumnType("jsonb");

        b.HasIndex(x => new { x.BatchId, x.RowNumber }).IsUnique();
        b.HasIndex(x => new { x.BatchId, x.ParseStatus });
        b.HasIndex(x => x.ExternalCustomerRef);
    }
}
