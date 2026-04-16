using BudgetTracker.Core.Entities;
using BudgetTracker.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class BudgetApprovalConfiguration : IEntityTypeConfiguration<BudgetApproval>
{
    public void Configure(EntityTypeBuilder<BudgetApproval> b)
    {
        b.ToTable("budget_approvals");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedOnAdd();

        b.Property(x => x.CompanyId).IsRequired();
        b.HasOne<Company>().WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.VersionId).IsRequired();
        b.HasOne<BudgetVersion>().WithMany().HasForeignKey(x => x.VersionId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.Stage)
            .HasConversion(new EnumToStringConverter<ApprovalStage>())
            .HasMaxLength(30)
            .IsRequired();

        b.Property(x => x.StageOrder).IsRequired();

        b.Property(x => x.ApproverId);

        b.Property(x => x.Decision)
            .HasConversion(new EnumToStringConverter<ApprovalDecision>())
            .HasMaxLength(20)
            .IsRequired();

        b.Property(x => x.Comment);
        b.Property(x => x.DecidedAt);
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => new { x.VersionId, x.StageOrder });
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}
