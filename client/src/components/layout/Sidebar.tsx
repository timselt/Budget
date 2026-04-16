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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-sl-surface-container py-8 px-4">
      <div className="mb-10 pl-2">
        <h1 className="font-headline text-xl font-black tracking-tighter text-sl-primary">
          Tur Assist
        </h1>
        <p className="mt-1 font-label text-xs font-medium text-sl-on-surface-variant">
          2026 Bütçe Planı
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 font-body text-sm tracking-[-0.02em]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? 'border-r-4 border-sl-primary bg-sl-surface-container-low font-bold text-sl-primary opacity-80'
                  : 'font-medium text-sl-on-surface-variant hover:bg-sl-surface-container-low/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? '' : 'group-hover:text-sl-primary'
                  }`}
                  style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <button className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2.5 font-body text-sm font-medium text-white transition-opacity hover:opacity-90">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Rapor İndir
        </button>
        <div className="mt-4 flex items-center gap-3 pl-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sl-surface-container-high">
            <span className="material-symbols-outlined text-sl-on-surface-variant text-[16px]">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sl-on-surface">{user?.displayName}</p>
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
