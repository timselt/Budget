import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◻' },
  { to: '/budget', label: 'Bütçe', icon: '◻' },
  { to: '/customers', label: 'Müşteriler', icon: '◻' },
  { to: '/expenses', label: 'Giderler', icon: '◻' },
  { to: '/fx-rates', label: 'Döviz Kurları', icon: '◻' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-white">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-semibold tracking-tight text-primary-700">
          BudgetTracker
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-muted hover:bg-surface-alt hover:text-text'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.displayName}</p>
            <p className="truncate text-xs text-text-muted">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-alt hover:text-danger"
          >
            Çıkış
          </button>
        </div>
      </div>
    </aside>
  )
}
