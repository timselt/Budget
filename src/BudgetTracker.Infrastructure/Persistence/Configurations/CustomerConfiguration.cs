using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("customers");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.CategoryCode).HasMaxLength(50);
        b.Property(x => x.SubCategory).HasMaxLength(100);
        b.Property(x => x.TaxId).HasMaxLength(20);
        b.Property(x => x.TaxOffice).HasMaxLength(100);

        b.Property(x => x.SegmentId).IsRequired();
        b.HasOne<Segment>().WithMany().HasForeignKey(x => x.SegmentId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.StartDate);
        b.Property(x => x.EndDate);
        b.Property(x => x.IsGroupInternal).IsRequired().HasDefaultValue(false);
        b.Property(x => x.AccountManager).HasMaxLength(100);
        b.Property(x => x.DefaultCurrencyCode).HasMaxLength(3);
        b.Property(x => x.SourceSheet).HasMaxLength(100);
        b.Property(x => x.Notes);
        b.Property(x => x.AccountNo).HasMaxLength(30);
        b.Property(x => x.FullTitle).HasMaxLength(500);
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.IsOtherFlag).IsRequired().HasDefaultValue(false);
        b.Property(x => x.ShortId).IsRequired().HasDefaultValue(0);
        b.Property(x => x.CreatedAt).IsRequired();

        // Mutabakat önkoşul #1 (00a) — dış sistem eşleme alanları.
        b.Property(x => x.ExternalCustomerRef).HasMaxLength(32);
        b.Property(x => x.ExternalSourceSystem).HasMaxLength(16);
        b.Property(x => x.ExternalRefVerifiedAt);
        b.Property(x => x.ExternalRefVerifiedByUserId);

        b.HasIndex(x => new { x.CompanyId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.CompanyId, x.ShortId })
            .IsUnique()
            .HasFilter("deleted_at IS NULL AND short_id > 0");

        // Aynı tenant içinde iki müşteri aynı dış koda sahip olamaz; ama alan
        // nullable olduğu için WHERE NOT NULL filtresiyle koşullu UNIQUE.
        b.HasIndex(x => new { x.CompanyId, x.ExternalCustomerRef })
            .IsUnique()
            .HasDatabaseName("ix_customer_external_ref")
            .HasFilter("external_customer_ref IS NOT NULL AND deleted_at IS NULL");

        // Import parser'ın /customers/lookup endpoint'i için arama indeksi.
        b.HasIndex(x => new { x.CompanyId, x.ExternalSourceSystem, x.ExternalCustomerRef })
            .HasDatabaseName("ix_customer_external_ref_lookup");

        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
