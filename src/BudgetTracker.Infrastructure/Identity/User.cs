using Microsoft.AspNetCore.Identity;

namespace BudgetTracker.Infrastructure.Identity;

public sealed class User : IdentityUser<int>
{
    public string DisplayName { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Faz 1.5 — TAG Portal SSO. OIDC `sub` claim değeri (TAG Portal AppUser.Id, Guid).
    /// JIT provisioning'de bu kolon üzerinden kullanıcı bulunur. Lokal Id (int)
    /// Identity tarafından oluşturulur ve foreign key'lerde kullanılmaya devam eder
    /// — sub master kimlik kaynağıdır ama user Id mevcut schema ile uyumlu kalır.
    ///
    /// Spec Q3-A "sub = lokal Id" idealdi; FinOps Tur'un IdentityUser&lt;int&gt; tabanı
    /// nedeniyle hibrit Q3-B uygulandı (kolon + unique index).
    /// </summary>
    public string? ExternalSubjectId { get; set; }

    public ICollection<UserCompany> Companies { get; set; } = new List<UserCompany>();
}
