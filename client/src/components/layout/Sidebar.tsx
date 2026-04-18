import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

interface NavDef {
  to: string
  label: string
  icon: string
  end?: boolean
}

const mainNav: readonly NavDef[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/budget/periods', label: 'Bütçe Versiyonları', icon: 'calendar_month' },
  { to: '/budget/planning', label: 'Bütçe Planlama', icon: 'edit_note' },
  { to: '/actuals', label: 'Gerçekleşen', icon: 'receipt_long' },
  { to: '/forecast', label: 'Forecast', icon: 'trending_up' },
  { to: '/variance', label: 'Sapma Analizi', icon: 'compare_arrows' },
  { to: '/reports', label: 'Raporlar', icon: 'assessment' },
  { to: '/reports/pnl', label: 'P&L Raporu', icon: 'monitoring' },
]

const mgmtNav: readonly NavDef[] = [
  { to: '/master-data', label: 'Master Data', icon: 'account_tree' },
  { to: '/segments', label: 'Kategori Yönetimi', icon: 'category' },
  { to: '/customers', label: 'Müşteri Yönetimi', icon: 'groups' },
  { to: '/products', label: 'Ürün Yönetimi', icon: 'inventory_2' },
  { to: '/consolidation', label: 'Konsolidasyon', icon: 'hub' },
  { to: '/approvals', label: 'Onay Akışı', icon: 'verified' },
  { to: '/audit', label: 'Audit Log', icon: 'history' },
]

function SidebarLink({ to, label, icon, end }: NavDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {icon}
      </span>
      {label}
    </NavLink>
  )
}

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const roleLine = user?.roles?.[0] ?? 'CEO • Tur Assist'
  const displayName = user?.displayName ?? 'Timur Turan'

  return (
    <aside className="w-64 fixed left-0 top-0 h-screen bg-surface-container-low flex flex-col py-6 px-3 z-50">
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>
              insights
            </span>
          </div>
          <h1 className="text-xl font-black tracking-display text-primary">
            FinOps<span className="text-on-surface">Tur</span>
          </h1>
        </div>
        <p className="text-xs text-on-surface-variant font-medium mt-1 pl-10">
          2026 Butce & Performans
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto pr-1">
        {mainNav.map((n) => (
          <SidebarLink key={n.to} {...n} />
        ))}

        <div className="nav-section">Yönetim</div>
        {mgmtNav.map((n) => (
          <SidebarLink key={n.to} {...n} />
        ))}
      </nav>

      <div className="mt-4 px-2">
        <button type="button" className="btn-primary w-full justify-center">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            download
          </span>
          Rapor İndir
        </button>
        <div className="mt-4 flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
            <p className="text-[0.65rem] text-on-surface-variant truncate">{roleLine}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded-md"
            title="Çıkış"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
