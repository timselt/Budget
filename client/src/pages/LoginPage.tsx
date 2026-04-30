import { useEffect } from 'react'
import { useAuthStore } from '../stores/auth'

/**
 * Faz 1.5 — TAG Portal SSO.
 * Eski email+password formu kaldırıldı. Sayfa render olunca otomatik olarak
 * TAG Portal /connect/authorize'a yönlendirir. Kullanıcı manuel butona da
 * basabilir (otomatik redirect başarısız olursa).
 *
 * Bu sayfa pratikte sadece "fallback" — AuthGuard zaten authenticated olmayan
 * kullanıcıyı doğrudan TAG Portal'a gönderiyor.
 */
export function LoginPage() {
  const { login, isLoading } = useAuthStore()

  useEffect(() => {
    // Otomatik yönlendirme — kullanıcı bekletmeyelim.
    login('/')
  }, [login])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm">
        <div className="card p-10">
          <div className="mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>
                insights
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-display text-primary">
              FinOps<span className="text-on-surface">Tur</span>
            </h1>
          </div>
          <p className="label-sm mb-8 block">Bütçe &amp; Performans Platformu</p>

          <p className="text-sm text-on-surface-variant mb-6">
            TAG Portal hesabınızla giriş yapacaksınız. Otomatik yönlendiriliyorsunuz...
          </p>

          <button
            onClick={() => login('/')}
            disabled={isLoading}
            className="btn-primary w-full justify-center"
          >
            {isLoading ? 'Yönlendiriliyor...' : 'TAG Portal ile Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  )
}
