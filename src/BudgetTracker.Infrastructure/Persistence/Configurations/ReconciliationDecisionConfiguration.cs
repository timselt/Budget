using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ReconciliationDecision EF mapping (Faz 1 spec §3.6). Tablo
/// <c>reconciliation_decisions</c>. Append-only — UPDATE/DELETE DB role
/// seviyesinde engellenmeli (Sprint 2'de RLS + role policy ile).
/// </summary>
public sealed class ReconciliationDecisionConfiguration
    : IEntityTypeConfiguration<ReconciliationDecision>
{
    public void Configure(EntityTypeBuilder<ReconciliationDecision> b)
    {
        b.ToTable("reconciliation_decisions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.LineId).IsRequired();
        b.HasOne<ReconciliationLine>().WithMany().HasForeignKey(x => x.LineId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Property(x => x.DecisionType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ActorUserId).IsRequired();
        b.Property(x => x.ActorRole).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.DecidedAt).IsRequired();
        b.Property(x => x.Note).HasMaxLength(2000);
        b.Property(x => x.EvidenceFileRef).HasMaxLength(500);

        b.HasIndex(x => new { x.LineId, x.DecidedAt });
        b.HasIndex(x => new { x.ActorUserId, x.DecidedAt });
    }
}
