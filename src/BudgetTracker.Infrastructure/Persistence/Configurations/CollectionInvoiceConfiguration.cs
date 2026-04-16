using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class CollectionInvoiceConfiguration : IEntityTypeConfiguration<CollectionInvoice>
{
    public void Configure(EntityTypeBuilder<CollectionInvoice> b)
    {
        b.ToTable("collection_invoices");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.ImportPeriodId).IsRequired();

        b.Property(x => x.CustomerId).IsRequired();
        b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.InvoiceNo).HasMaxLength(50).IsRequired();
        b.Property(x => x.TransactionDate).IsRequired();
        b.Property(x => x.DueDate).IsRequired();
        b.Property(x => x.DaysDiff).IsRequired();
        b.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
        b.Property(x => x.Note);

        b.Property(x => x.Status)
            .HasConversion(new EnumToStringConverter<InvoiceCollectionStatus>())
            .HasMaxLength(20)
            .IsRequired();

        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => new { x.CompanyId, x.CustomerId });
        b.HasIndex(x => new { x.CompanyId, x.ImportPeriodId });
        b.HasIndex(x => x.InvoiceNo);
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
