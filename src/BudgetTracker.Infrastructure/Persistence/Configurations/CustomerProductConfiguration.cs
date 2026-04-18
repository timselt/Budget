using BudgetTracker.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class CustomerProductConfiguration : IEntityTypeConfiguration<CustomerProduct>
{
    public void Configure(EntityTypeBuilder<CustomerProduct> b)
    {
        b.ToTable("customer_products");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ProductId).IsRequired();
        b.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.CommissionRate).HasColumnType("numeric(6,3)");
        b.Property(x => x.UnitPriceTry).HasColumnType("numeric(18,2)");
        b.Property(x => x.StartDate);
        b.Property(x => x.EndDate);
        b.Property(x => x.Notes);
        b.Property(x => x.IsActive).IsRequired();

        // Aynı müşteri-ürün aynı başlangıç tarihinde iki kez aktifleşemez;
        // tarih aralığıyla sözleşme yenileme (renewal) için composite unique.
        b.HasIndex(x => new { x.CompanyId, x.CustomerId, x.ProductId, x.StartDate }).IsUnique();
        b.HasIndex(x => new { x.CustomerId, x.IsActive });
        b.HasIndex(x => new { x.ProductId, x.IsActive });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
