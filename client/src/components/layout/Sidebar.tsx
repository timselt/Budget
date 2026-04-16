import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/budget', label: 'Bütçe' },
  { to: '/budget/versions', label: 'Versiyonlar' },
  { to: '/customers', label: 'Müşteriler' },
  { to: '/expenses', label: 'Giderler' },
  { to: '/variance', label: 'BvA Raporu' },
  { to: '/scenarios', label: 'Senaryolar' },
  { to: '/fx-rates', label: 'Döviz Kurları' },
  { to: '/approvals', label: 'Onaylar' },
  { to: '/tahsilat', label: 'Tahsilat' },
  { to: '/tahsilat/import', label: 'Veri Yükle' },
  { to: '/admin', label: 'Ayarlar' },
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
