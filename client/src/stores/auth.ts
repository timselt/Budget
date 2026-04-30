import { create } from 'zustand'
import axios from 'axios'

// Faz 1.5 — TAG Portal SSO
// FinOps Tur artık OIDC client; auth state'i cookie üzerinden yönetilir,
// localStorage'da token YOK. Login/logout server-side redirect ile çalışır.

interface UserInfo {
  subject: string
  email: string
  name: string
  roles: string[]
  tagPortalRoles: string[]
  tagPortalCompanies: string[]
  clearanceLevel: string | null
  departments: string[]
}

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  /** Sunucuya redirect → TAG Portal /connect/authorize. Async değil. */
  login: (returnUrl?: string) => void
  /** Sunucuya redirect → cookie clear + TAG Portal /connect/logout. */
  logout: (returnUrl?: string) => void
  /** GET /api/auth/me — cookie ile claim/rol bilgisi. AuthGuard çağırır. */
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: (returnUrl = '/') => {
    const url = `/api/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    window.location.href = url
  },

  logout: (returnUrl = '/') => {
    const url = `/api/auth/logout?returnUrl=${encodeURIComponent(returnUrl)}`
    window.location.href = url
  },

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const { data } = await axios.get('/api/auth/me', { withCredentials: true })
      set({
        user: {
          subject: data.subject ?? '',
          email: data.email ?? '',
          name: data.name ?? '',
          roles: Array.isArray(data.roles) ? data.roles : [],
          tagPortalRoles: Array.isArray(data.tagPortalRoles) ? data.tagPortalRoles : [],
          tagPortalCompanies: Array.isArray(data.tagPortalCompanies) ? data.tagPortalCompanies : [],
          clearanceLevel: data.clearanceLevel ?? null,
          departments: Array.isArray(data.departments) ? data.departments : [],
        },
        isAuthenticated: true,
      })
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
