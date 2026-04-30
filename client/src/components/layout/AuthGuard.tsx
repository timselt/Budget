import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Faz 1.5 — TAG Portal SSO.
 * Sayfa açıldığında /api/auth/me ile cookie kontrolü yapar.
 * - Authenticated → children render et
 * - 401 → TAG Portal /connect/authorize'a server-side redirect (login.tsx artık
 *   sadece "TAG Portal ile giriş yap" butonunu göstermek için kullanılır)
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, fetchUser, login } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetchUser().finally(() => setChecking(false))
  }, [fetchUser])

  if (checking || (isAuthenticated && !user)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-on-surface-variant">Yükleniyor...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    // TAG Portal'a server-side redirect (cookie henüz set değil; SPA route /login
    // yerine direkt OIDC challenge'a gönder)
    const returnUrl = window.location.pathname + window.location.search
    login(returnUrl)
    return null
  }

  return <>{children}</>
}
