import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◻' },
  { to: '/budget', label: 'Bütçe', icon: '◻' },
  { to: '/budget/versions', label: 'Versiyonlar', icon: '◻' },
  { to: '/customers', label: 'Müşteriler', icon: '◻' },
  { to: '/expenses', label: 'Giderler', icon: '◻' },
  { to: '/variance', label: 'BvA Raporu', icon: '◻' },
  { to: '/scenarios', label: 'Senaryolar', icon: '◻' },
  { to: '/fx-rates', label: 'Döviz Kurları', icon: '◻' },
  { to: '/approvals', label: 'Onaylar', icon: '◻' },
  { to: '/tahsilat', label: 'Tahsilat', icon: '◻' },
  { to: '/tahsilat/import', label: 'Veri Yukle', icon: '◻' },
  { to: '/admin', label: 'Ayarlar', icon: '◻' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex h-screen w-60 flex-col bg-sl-surface-low">
      <div className="flex h-14 items-center px-4">
        <span className="font-display text-lg font-semibold tracking-tight text-sl-primary">
          BudgetTracker
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-sl-surface-lowest font-medium text-sl-primary'
                  : 'text-sl-on-surface-variant hover:bg-sl-surface-high'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sl-on-surface">{user?.displayName}</p>
            <p className="truncate text-xs text-sl-on-surface-variant">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md px-2 py-1 text-xs text-sl-on-surface-variant hover:bg-sl-surface-high hover:text-sl-error"
          >
            Çıkış
          </button>
        </div>
      </div>
    </aside>
  )
}
