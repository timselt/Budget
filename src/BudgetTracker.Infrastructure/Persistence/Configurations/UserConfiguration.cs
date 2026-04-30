using BudgetTracker.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Faz 1.5 — TAG Portal SSO `sub` claim'i için unique index. JIT
        // provisioning'de kullanıcı bu kolon üzerinden bulunur.
        builder.Property(u => u.ExternalSubjectId)
            .HasMaxLength(64); // Guid string 36 char + buffer

        builder.HasIndex(u => u.ExternalSubjectId)
            .IsUnique()
            .HasFilter("\"external_subject_id\" IS NOT NULL");
    }
}
