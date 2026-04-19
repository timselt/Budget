using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// AccountingInstruction EF mapping (Faz 1 spec §3.7). Tablo
/// <c>accounting_instructions</c>. <b>Sprint 1:</b> tablo iskelet —
/// export Sprint 4'te aktive edilir.
/// </summary>
public sealed class AccountingInstructionConfiguration
    : IEntityTypeConfiguration<AccountingInstruction>
{
    public void Configure(EntityTypeBuilder<AccountingInstruction> b)
    {
        b.ToTable("accounting_instructions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CaseId).IsRequired();
        b.HasOne<ReconciliationCase>().WithMany().HasForeignKey(x => x.CaseId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.PeriodCode).IsRequired().HasMaxLength(7).IsFixedLength();
        b.Property(x => x.Flow).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.LinesSummary).IsRequired().HasColumnType("jsonb");
        b.Property(x => x.TotalAmount).IsRequired().HasColumnType("numeric(18,2)");
        b.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3).IsFixedLength();
        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ExportedAt);
        b.Property(x => x.ExportedFormat).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ExternalRef).HasMaxLength(255);

        b.HasIndex(x => new { x.CompanyId, x.Status });
        b.HasIndex(x => new { x.CompanyId, x.PeriodCode, x.Flow });
        b.HasIndex(x => x.CaseId);
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
