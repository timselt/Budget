using BudgetTracker.Core.Entities;
using BudgetTracker.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class UserSegmentConfiguration : IEntityTypeConfiguration<UserSegment>
{
    public void Configure(EntityTypeBuilder<UserSegment> b)
    {
        b.ToTable("user_segments");
        b.HasKey(x => new { x.UserId, x.SegmentId });

        b.Property(x => x.UserId).IsRequired();
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        b.Property(x => x.SegmentId).IsRequired();
        b.HasOne<Segment>().WithMany().HasForeignKey(x => x.SegmentId).OnDelete(DeleteBehavior.Cascade);

        b.Property(x => x.CanEdit).IsRequired().HasDefaultValue(false);
    }
}
