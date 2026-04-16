import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, fetchUser } = useAuthStore()
  const [checking, setChecking] = useState(!user && isAuthenticated)

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser().finally(() => setChecking(false))
    }
  }, [isAuthenticated, user, fetchUser])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-body text-sm text-sl-on-surface-variant">Yükleniyor...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
