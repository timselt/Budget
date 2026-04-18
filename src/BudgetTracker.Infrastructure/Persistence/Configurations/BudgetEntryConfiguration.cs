using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class BudgetEntryConfiguration : IEntityTypeConfiguration<BudgetEntry>
{
    public void Configure(EntityTypeBuilder<BudgetEntry> b)
    {
        b.ToTable("budget_entries");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.VersionId).IsRequired();
        b.HasOne<BudgetVersion>().WithMany().HasForeignKey(x => x.VersionId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);

        // ADR-0013 — nullable during transition; new rows should populate it.
        b.Property(x => x.ProductId);
        b.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);

        // ADR-0014 §2.6 — kontrat bazlı giriş; ProductId ile paralel geçiş.
        b.Property(x => x.ContractId);
        b.HasOne<Contract>().WithMany().HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Month).IsRequired();

        // ADR-0013 §5 — adet. UnitPriceTry × Quantity = AmountOriginal
        // (service katmanında hesaplanır). Geçiş döneminde nullable.
        b.Property(x => x.Quantity);

        b.Property(x => x.EntryType)
            .HasConversion(new EnumToStringConverter<EntryType>())
            .HasMaxLength(10)
            .IsRequired();

        b.Property(x => x.AmountOriginal).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.CurrencyCode).HasMaxLength(3).IsFixedLength().IsRequired();
        b.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyCode).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.AmountTryFixed).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.AmountTrySpot).HasPrecision(18, 2).IsRequired();

        b.Property(x => x.Notes);
        b.Property(x => x.CreatedAt).IsRequired();

        // Unique = (version, customer, product, month, entry_type). ProductId
        // nullable olduğu için PostgreSQL'de NULL satırlar unique check'ten
        // muaf — geçiş döneminde tek "eski" satır + N adet ürün-bazlı satır
        // aynı müşteri×ay×entry_type için var olabilir (ADR-0013 §2.2).
        b.HasIndex(x => new { x.VersionId, x.CustomerId, x.ProductId, x.Month, x.EntryType }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.VersionId, x.CustomerId, x.Month });
        b.HasIndex(x => new { x.ProductId, x.Month });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
