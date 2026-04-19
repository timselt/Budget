import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { SidebarRequiredRole } from '../layout/sidebar-config'

interface RoleGuardProps {
  allow: ReadonlyArray<SidebarRequiredRole>
  children: React.ReactNode
}

/**
 * Route-level rol kontrolü. Yetkili değilse mevcut /forbidden landing'ine
 * yönlendirir (App.tsx'te tanımlı). useAuthStore.user.roles üzerinden
 * intersect kontrolü; user henüz yüklenmediyse children render eder
 * (AuthGuard zaten authentication'ı garanti ediyor).
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { user } = useAuthStore()
  // user null olabilir (henüz fetchUser tamamlanmadı). AuthGuard zaten
  // outside'da authentication kontrolünü yapıyor; biz sadece rol kontrolü.
  // user hazır değilse pessimistik davranma — children göster (AuthGuard
  // hata durumunda zaten yönlendirir).
  if (!user) return <>{children}</>
  const userRoles = new Set(user.roles ?? [])
  const allowed = allow.some((r) => userRoles.has(r))
  if (!allowed) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
