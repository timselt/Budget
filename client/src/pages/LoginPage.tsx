import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('Geçersiz e-posta veya şifre')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sl-surface">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-sl-outline-variant/15 bg-sl-glass-bg p-8 backdrop-blur-[20px]">
          <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-sl-primary">
            BudgetTracker
          </h1>
          <p className="mb-6 font-body text-sm text-sl-on-surface-variant">
            Tur Assist Group Bütçe Takip
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block font-body text-xs uppercase tracking-wider text-sl-on-surface-variant">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-sl-surface-high px-3 py-2.5 font-body text-sm text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
                placeholder="admin@tag.local"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block font-body text-xs uppercase tracking-wider text-sl-on-surface-variant">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-sl-surface-high px-3 py-2.5 font-body text-sm text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
              />
            </div>

            {error && (
              <p className="font-body text-sm text-sl-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2.5 font-body text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
