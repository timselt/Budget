using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>
/// ADR-0014 Contract EF mapping. Tablo <c>contracts</c>. Enum kolonları
/// string olarak saklanır (operasyonel okunabilirlik). Unique index
/// <c>(company_id, contract_code)</c> soft-delete filtreli.
/// </summary>
public sealed class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> b)
    {
        b.ToTable("contracts");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ProductId).IsRequired();
        b.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerShortId).IsRequired();
        b.Property(x => x.UnitPriceTry).HasColumnType("numeric(18,2)");
        b.Property(x => x.StartDate);
        b.Property(x => x.EndDate);
        b.Property(x => x.Notes);
        b.Property(x => x.IsActive).IsRequired();

        // 00b Mutabakat genişletmeleri
        b.Property(x => x.ContractName).HasMaxLength(255);
        b.Property(x => x.CurrencyCode).IsRequired().HasMaxLength(3).IsFixedLength();
        b.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.TerminationReason).HasMaxLength(500);
        b.Ignore(x => x.Flow); // SalesType'tan türetilir, DB'de yok

        // ADR-0014 enum kolonları (string-persisted)
        b.Property(x => x.BusinessLine).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.SalesType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ProductType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.VehicleType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ContractForm).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ContractType).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.PaymentFrequency).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.AdjustmentClause).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ContractKind).IsRequired().HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.ServiceArea).IsRequired().HasConversion<string>().HasMaxLength(30);

        b.Property(x => x.Version).IsRequired();
        b.Property(x => x.RevisionCount).IsRequired();
        b.Property(x => x.ContractCode).IsRequired().HasMaxLength(40);

        b.HasIndex(x => new { x.CompanyId, x.ContractCode })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
        b.HasIndex(x => new { x.CompanyId, x.CustomerId, x.ProductId, x.StartDate })
            .IsUnique();
        b.HasIndex(x => new { x.CustomerId, x.IsActive });
        b.HasIndex(x => new { x.ProductId, x.IsActive });
        b.HasIndex(x => new { x.CompanyId, x.Status, x.CustomerId });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
