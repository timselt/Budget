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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label-sm mb-2 block">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="admin@tag.local"
              />
            </div>

            <div>
              <label htmlFor="password" className="label-sm mb-2 block">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
