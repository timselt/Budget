using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// RiskRuleSet EF mapping (Faz 1 spec §8). Tablo <c>risk_rule_sets</c>.
/// Flow başına aynı anda tek aktif kural (effective_to=null) olur — bu DB
/// constraint olarak Sprint 1'de eklenmez (Sprint 2'de partial unique
/// index ile devreye gelir; Sprint 1'de servis seviye guard yeterli).
/// </summary>
public sealed class RiskRuleSetConfiguration
    : IEntityTypeConfiguration<RiskRuleSet>
{
    public void Configure(EntityTypeBuilder<RiskRuleSet> b)
    {
        b.ToTable("risk_rule_sets");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.Flow).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.LowToMediumDays).IsRequired();
        b.Property(x => x.MediumToHighDays).IsRequired();
        b.Property(x => x.EffectiveFrom).IsRequired();
        b.Property(x => x.EffectiveTo);
        b.Property(x => x.UpdatedByUserId).IsRequired();

        b.HasIndex(x => new { x.Flow, x.EffectiveFrom });
    }
}
