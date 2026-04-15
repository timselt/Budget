using BudgetTracker.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class UserCompanyConfiguration : IEntityTypeConfiguration<UserCompany>
{
    public void Configure(EntityTypeBuilder<UserCompany> builder)
    {
        builder.ToTable("user_companies");

        builder.HasKey(x => new { x.UserId, x.CompanyId });

        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.CompanyId).HasColumnName("company_id");
        builder.Property(x => x.IsDefault).HasColumnName("is_default").HasDefaultValue(false);
        builder.Property(x => x.AssignedAt).HasColumnName("assigned_at");
        builder.Property(x => x.AssignedByUserId).HasColumnName("assigned_by_user_id");

        builder.HasOne(x => x.User)
            .WithMany(u => u.Companies)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_user_companies_user_id");
        builder.HasIndex(x => x.CompanyId).HasDatabaseName("ix_user_companies_company_id");
    }
}
