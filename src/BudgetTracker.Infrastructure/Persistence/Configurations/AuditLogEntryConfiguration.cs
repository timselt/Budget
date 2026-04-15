using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> b)
    {
        // audit_logs is a partitioned table created via raw SQL in the InitialSchema migration.
        // EF only knows the logical shape so we can issue inserts/queries through DbContext,
        // but the table DDL (PARTITION BY RANGE, monthly partitions, INSERT-only role) is owned by SQL.
        b.ToTable("audit_logs");

        // Composite key (id, created_at) because Postgres requires the partition key to be in PK.
        b.HasKey(x => new { x.Id, x.CreatedAt });
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId);
        b.Property(x => x.UserId);
        b.Property(x => x.EntityName).HasMaxLength(128).IsRequired();
        b.Property(x => x.EntityKey).HasMaxLength(128).IsRequired();
        b.Property(x => x.Action).HasMaxLength(32).IsRequired();
        b.Property(x => x.OldValuesJson).HasColumnType("jsonb");
        b.Property(x => x.NewValuesJson).HasColumnType("jsonb");
        b.Property(x => x.CorrelationId).HasMaxLength(64);
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.Property(x => x.CreatedAt).IsRequired();
    }
}
