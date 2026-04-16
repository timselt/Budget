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
    <div className="flex min-h-screen items-center justify-center bg-sl-surface-container-low">
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-sl-glass-bg p-10 shadow-[0_12px_32px_rgba(25,28,31,0.04)] backdrop-blur-[20px]">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sl-primary to-sl-primary-container">
              <span className="material-symbols-outlined filled text-white text-[22px]">account_balance</span>
            </div>
            <h1 className="font-headline text-2xl font-black tracking-tighter text-sl-on-surface">
              BudgetTracker
            </h1>
          </div>
          <p className="mb-8 font-label text-xs uppercase tracking-widest text-sl-on-surface-variant">
            Tur Assist Group Bütçe Takip
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block font-label text-xs font-bold uppercase tracking-widest text-sl-on-surface-variant">
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
              <label htmlFor="password" className="mb-2 block font-label text-xs font-bold uppercase tracking-widest text-sl-on-surface-variant">
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
              className="w-full rounded-lg bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-3 font-label text-sm font-bold uppercase tracking-[0.05em] text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
            >
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
