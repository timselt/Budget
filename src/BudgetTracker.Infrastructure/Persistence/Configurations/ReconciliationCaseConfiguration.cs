using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Entities.Reconciliation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ReconciliationCase EF mapping (Faz 1 spec §3.4). Tablo
/// <c>reconciliation_cases</c>. Benzersizlik:
/// (company_id, flow, period_code, customer_id) — aynı müşteriye aynı
/// dönemde iki case açılamaz. <b>Sprint 1:</b> tablo iskelet kalır;
/// case auto-create Sprint 2'de.
/// </summary>
public sealed class ReconciliationCaseConfiguration
    : IEntityTypeConfiguration<ReconciliationCase>
{
    public void Configure(EntityTypeBuilder<ReconciliationCase> b)
    {
        b.ToTable("reconciliation_cases");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Flow).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.PeriodCode).IsRequired().HasMaxLength(7).IsFixedLength();

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ContractId);
        b.HasOne<Contract>().WithMany().HasForeignKey(x => x.ContractId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.OwnerUserId).IsRequired();
        b.Property(x => x.OpenedAt).IsRequired();
        b.Property(x => x.SentToCustomerAt);
        b.Property(x => x.CustomerResponseAt);
        b.Property(x => x.SentToAccountingAt);
        b.Property(x => x.TotalAmount).IsRequired().HasColumnType("numeric(18,2)");
        b.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3).IsFixedLength();
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.CompanyId, x.Flow, x.PeriodCode, x.CustomerId }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.Status });
        b.HasIndex(x => x.OwnerUserId);
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
