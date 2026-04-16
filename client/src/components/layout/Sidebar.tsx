import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/budget', label: 'Bütçe', icon: 'monetization_on' },
  { to: '/budget/versions', label: 'Versiyonlar', icon: 'history' },
  { to: '/customers', label: 'Müşteriler', icon: 'groups' },
  { to: '/expenses', label: 'Giderler', icon: 'account_balance_wallet' },
  { to: '/variance', label: 'BvA Raporu', icon: 'query_stats' },
  { to: '/scenarios', label: 'Senaryolar', icon: 'analytics' },
  { to: '/fx-rates', label: 'Döviz Kurları', icon: 'currency_exchange' },
  { to: '/approvals', label: 'Onaylar', icon: 'task_alt' },
  { to: '/tahsilat', label: 'Tahsilat', icon: 'receipt_long' },
  { to: '/tahsilat/import', label: 'Veri Yükle', icon: 'upload_file' },
  { to: '/admin', label: 'Ayarlar', icon: 'settings' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-sl-surface-container">
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sl-primary to-sl-primary-container">
          <span className="material-symbols-outlined filled text-white text-[20px]">account_balance</span>
        </div>
        <div>
          <p className="font-headline text-base font-bold tracking-tight text-sl-on-surface">
            BudgetTracker
          </p>
          <p className="font-label text-[10px] font-medium uppercase tracking-widest text-sl-on-surface-variant">
            Tur Assist Group
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1 px-3 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-sl-surface-lowest font-bold text-sl-primary'
                  : 'text-sl-on-surface-variant hover:bg-sl-surface-lowest'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-sl-primary" />
                )}
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="font-label text-xs uppercase tracking-[0.05em]">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sl-ghost-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sl-surface-container-high">
            <span className="material-symbols-outlined text-sl-on-surface-variant text-[18px]">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-label text-xs font-semibold text-sl-on-surface">{user?.displayName}</p>
            <p className="truncate text-[10px] text-sl-on-surface-variant">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-sl-on-surface-variant transition-colors hover:bg-sl-error-container hover:text-sl-error"
            title="Çıkış Yap"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
