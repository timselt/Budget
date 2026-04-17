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
  { to: '/budget/planning', label: 'Bütçe Planlama', icon: 'edit_note' },
  { to: '/actuals', label: 'Gerçekleşen', icon: 'receipt_long' },
  { to: '/forecast', label: 'Forecast', icon: 'trending_up' },
  { to: '/variance', label: 'Sapma Analizi', icon: 'compare_arrows' },
  { to: '/reports', label: 'Raporlar', icon: 'assessment' },
]

const mgmtNav: readonly NavDef[] = [
  { to: '/master-data', label: 'Master Data', icon: 'account_tree' },
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
    <aside className="w-[280px] fixed left-0 top-0 h-screen bg-secondary flex flex-col py-8 z-50">
      <div className="px-8 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>
              insights
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-display text-white">
            FinOps<span className="text-white/70">Tur</span>
          </h1>
        </div>
        <p className="text-[10px] tracking-[0.2em] text-white/50 font-bold mt-2 pl-12 uppercase">
          Architectural Precision
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto pr-0">
        {mainNav.map((n) => (
          <SidebarLink key={n.to} {...n} />
        ))}

        <div className="nav-section">Yönetim</div>
        {mgmtNav.map((n) => (
          <SidebarLink key={n.to} {...n} />
        ))}
      </nav>

      <div className="mt-6 px-8">
        <button type="button" className="btn-primary w-full justify-center">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            download
          </span>
          Rapor İndir
        </button>
        <div className="mt-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-[0.65rem] text-white/60 truncate">{roleLine}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-white/60 hover:text-white transition-colors rounded-md"
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
