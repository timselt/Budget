import { create } from 'zustand'
import axios from 'axios'

interface UserInfo {
  id: number
  email: string
  displayName: string
  roles: string[]
  activeCompanyId: number
}

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await axios.post('/connect/token', new URLSearchParams({
        grant_type: 'password',
        username: email,
        password,
        client_id: 'budget-tracker-dev',
        scope: 'openid profile email api',
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      set({ isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('access_token')
      const { data } = await axios.get('/connect/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      set({ user: data })
    } catch {
      set({ user: null, isAuthenticated: false })
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },
}))
